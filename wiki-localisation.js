// Shared wiki-only localisation helpers.
// Game entity names/descriptions continue to come from *_localisation.json files.
(function () {
    'use strict';

    const originalGetDisplayKey = window.getDisplayKey;
    const originalRenderFieldValue = window.renderFieldValue;
    const originalLoadDetail = window.loadDetail;

    const relicReferenceFields = {
        'Craft Material x1': 'materials',
        'Craft Ability x5': 'abilities'
    };

    let abilityCostPromise = null;

    function loadScriptOnce(src, globalName) {
        if (globalName && window[globalName]) return Promise.resolve(window[globalName]);
        const existing = Array.from(document.scripts).find(script => {
            const value = script.getAttribute('src') || '';
            return value === src || value.endsWith('/' + src);
        });
        if (existing) {
            if (!globalName || window[globalName]) return Promise.resolve(window[globalName]);
            return new Promise((resolve, reject) => {
                existing.addEventListener('load', () => resolve(globalName ? window[globalName] : true), { once: true });
                existing.addEventListener('error', reject, { once: true });
            });
        }

        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = () => resolve(globalName ? window[globalName] : true);
            script.onerror = () => reject(new Error(`Failed to load ${src}`));
            document.head.appendChild(script);
        });
    }

    async function ensureAbilityCost() {
        if (abilityCostPromise) return abilityCostPromise;
        abilityCostPromise = loadScriptOnce('ability-cost.js', 'JobmaniaAbilityCost')
            .then(engine => engine?.load ? engine.load('data/ability_costs.json', 'data/abilities.json').then(() => engine) : engine)
            .catch(error => {
                console.error('Failed to load Ability AP costs:', error);
                abilityCostPromise = null;
                return null;
            });
        return abilityCostPromise;
    }

    // Delivery wording is a reusable SkillUnit description layer. It stays plain
    // text in the wiki; only underlying combat mechanics are clickable. Preload
    // skillunit.js here so delivery rules are installed deterministically before
    // the description renderer asks the SkillUnit engine for output.
    Promise.all([
        loadScriptOnce('delivery-patterns.js', 'JobmaniaDeliveryPatterns'),
        loadScriptOnce('skillunit.js', 'JobmaniaSkillUnit')
    ]).then(async ([delivery, skillunit]) => {
        if (delivery?.load) await delivery.load('data/delivery_patterns.json');
        delivery?.install?.(skillunit);
    }).catch(error => console.error('Failed to load delivery patterns:', error));

    function fieldLabel(cat, key) {
        if (cat === 'abilities' && key === 'AbilityKey') return window.JOBMANIA_UI?.ability || 'Ability';
        if (cat === 'passives' && key === 'PassiveKey') return window.JOBMANIA_UI?.passive || 'Passive';
        if (cat === 'relic' && key === 'RelicKey') return window.JOBMANIA_UI?.relic || 'Relic';

        const statMatch = String(key).match(/^(Lv\d+)\s+(HP|Str|Agi|Int)$/);
        if (statMatch && window.JOBMANIA_STAT_LABELS?.[statMatch[2]]) {
            return `${statMatch[1]} ${window.JOBMANIA_STAT_LABELS[statMatch[2]]}`;
        }

        return window.JOBMANIA_FIELD_LABELS?.[key] || null;
    }

    function translateValue(field, value) {
        const fieldMap = window.JOBMANIA_VALUE_LABELS?.[field];
        if (!fieldMap) return value;
        const raw = String(value);
        return fieldMap[raw] ?? fieldMap[raw.toLowerCase()] ?? value;
    }

    function renderRelicReference(cat, key, value, clickable) {
        if (cat !== 'relic' || typeof value !== 'string' || !value) return null;
        const refCat = relicReferenceFields[key];
        if (!refCat) return null;

        if (clickable && typeof window.detailLink === 'function') {
            return window.detailLink(refCat, value);
        }

        const localized = typeof window.getLocalizedName === 'function'
            ? window.getLocalizedName(refCat, value)
            : value;

        return typeof window.escapeHtml === 'function'
            ? window.escapeHtml(localized)
            : String(localized);
    }

    if (typeof originalGetDisplayKey === 'function') {
        window.getDisplayKey = function (cat, key) {
            return fieldLabel(cat, key) || originalGetDisplayKey.apply(this, arguments);
        };
    }

    if (typeof originalRenderFieldValue === 'function') {
        window.renderFieldValue = function (cat, key, value, clickable) {
            if (cat === 'abilities' && key === 'Ability Tier' && String(value).toLowerCase().trim() === 'curse') {
                return '☆';
            }

            const relicReference = renderRelicReference(cat, key, value, clickable);
            if (relicReference !== null) return relicReference;

            const rendered = originalRenderFieldValue.apply(this, arguments);
            const emoji = typeof window.getRankEmoji === 'function' ? window.getRankEmoji(cat, key, value) : '';
            if (emoji) return rendered;

            const translated = translateValue(key, value);
            if (translated === value) return rendered;

            return typeof window.escapeHtml === 'function'
                ? window.escapeHtml(translated)
                : String(translated);
        };
    }

    function removeHiddenRows(cat) {
        const hidden = new Set(window.JOBMANIA_HIDDEN_FIELDS?.[cat] || []);
        if (!hidden.size) return;

        document.querySelectorAll('#content .info-row').forEach(row => {
            const label = row.querySelector('.info-label')?.textContent?.replace(/:\s*$/, '').trim();
            if (label && hidden.has(label)) row.remove();
        });
    }

    async function insertAbilityCost(abilityKey) {
        const engine = await ensureAbilityCost();
        const info = engine?.getInfo?.(abilityKey, window.JOBMANIA_LOCALE || 'en');
        if (!info) return;

        const basicInfoList = document.querySelector('#content .detail-stack .detail-section .info-list');
        if (!basicInfoList || basicInfoList.querySelector('.ability-ap-cost-row')) return;

        const row = document.createElement('div');
        row.className = 'info-row ability-ap-cost-row';

        const label = document.createElement('div');
        label.className = 'info-label';
        label.textContent = `${info.label}:`;

        const value = document.createElement('div');
        value.className = 'info-value';
        value.textContent = String(info.baseCost);

        row.appendChild(label);
        row.appendChild(value);

        const tierLabel = typeof window.getDisplayKey === 'function'
            ? window.getDisplayKey('abilities', 'Ability Tier')
            : (window.JOBMANIA_FIELD_LABELS?.['Ability Tier'] || 'Ability Tier');

        const tierRow = Array.from(basicInfoList.querySelectorAll('.info-row')).find(item => {
            const text = item.querySelector('.info-label')?.textContent?.replace(/:\s*$/, '').trim();
            return text === tierLabel;
        });

        if (tierRow) tierRow.insertAdjacentElement('afterend', row);
        else basicInfoList.appendChild(row);
    }

    // Primary path: decorate the shared detail loader.
    if (typeof originalLoadDetail === 'function') {
        window.loadDetail = async function (cat, key) {
            const result = await originalLoadDetail.apply(this, arguments);
            const normalizedCat = String(cat).toLowerCase();
            removeHiddenRows(normalizedCat);
            if (normalizedCat === 'abilities') await insertAbilityCost(key);
            return result;
        };
    }

    // Fallback path for browsers/inline handlers that resolve the original global
    // loadDetail binding instead of window.loadDetail after it has been decorated.
    // This keeps AP rendering reliable without changing the core wiki renderer.
    document.addEventListener('click', event => {
        const target = event.target instanceof Element ? event.target.closest('[data-key]') : null;
        if (!target) return;

        const explicitCat = String(target.dataset.cat || '').toLowerCase();
        const listAbility = target.classList.contains('list-card') && String(window.lastView || '').toLowerCase() === 'abilities';
        if (explicitCat !== 'abilities' && !listAbility) return;

        const abilityKey = target.dataset.key;
        if (!abilityKey) return;

        setTimeout(() => {
            insertAbilityCost(abilityKey).catch(error => console.error('Failed to insert Ability AP cost:', error));
        }, 0);
    }, true);
})();
