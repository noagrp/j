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

    if (typeof originalLoadDetail === 'function') {
        window.loadDetail = async function (cat) {
            const result = await originalLoadDetail.apply(this, arguments);
            removeHiddenRows(String(cat).toLowerCase());
            return result;
        };
    }
})();
