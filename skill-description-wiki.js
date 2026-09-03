// Jobmania Wiki - Ability / Passive Description Renderer
// English descriptions resolve live from SkillUnit source JSON through
// skillunit.js + mechanics.js. Existing localisation JSON remains the
// fallback/source for translated pages.
(function () {
    'use strict';

    let abilityDescriptionMap = null;
    let passiveDescriptionMap = null;
    let abilityDescriptionPromise = null;
    let passiveDescriptionPromise = null;

    let abilitySkillUnitMap = null;
    let passiveSkillUnitMap = null;
    let abilitySkillUnitPromise = null;
    let passiveSkillUnitPromise = null;
    let runtimePromise = null;

    function loadScriptOnce(src, globalName) {
        if (globalName && window[globalName]) return Promise.resolve(window[globalName]);
        const existing = Array.from(document.scripts).find(script => {
            const value = script.getAttribute('src') || '';
            return value === src || value.endsWith('/' + src);
        });
        if (existing) {
            if (!globalName || window[globalName]) return Promise.resolve(window[globalName]);
            return new Promise((resolve, reject) => {
                existing.addEventListener('load', () => resolve(window[globalName]), { once: true });
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

    async function ensureRuntime() {
        if (runtimePromise) return runtimePromise;
        runtimePromise = (async function () {
            await loadScriptOnce('skillunit.js', 'JobmaniaSkillUnit');
            await loadScriptOnce('mechanics.js', 'JobmaniaMechanics');
            if (window.JobmaniaMechanics?.load) {
                await window.JobmaniaMechanics.load('data/mechanics.json');
            }
            return window.JobmaniaSkillUnit;
        })().catch(error => {
            console.error('Failed to load SkillUnit mechanics runtime:', error);
            runtimePromise = null;
            return null;
        });
        return runtimePromise;
    }

    async function ensureSkillUnitSource(cat) {
        if (cat === 'abilities') {
            if (abilitySkillUnitMap) return abilitySkillUnitMap;
            if (abilitySkillUnitPromise) return abilitySkillUnitPromise;
            abilitySkillUnitPromise = fetch('data/abilities_description.json')
                .then(res => {
                    if (!res.ok) throw new Error(`HTTP ${res.status}`);
                    return res.json();
                })
                .then(rows => {
                    abilitySkillUnitMap = new Map((Array.isArray(rows) ? rows : []).map(item => [item.AbilityKey, item]));
                    return abilitySkillUnitMap;
                })
                .catch(error => {
                    console.error('Failed to load Ability SkillUnits:', error);
                    abilitySkillUnitMap = new Map();
                    return abilitySkillUnitMap;
                });
            return abilitySkillUnitPromise;
        }

        if (cat === 'passives') {
            if (passiveSkillUnitMap) return passiveSkillUnitMap;
            if (passiveSkillUnitPromise) return passiveSkillUnitPromise;
            passiveSkillUnitPromise = fetch('data/passives_description.json')
                .then(res => {
                    if (!res.ok) throw new Error(`HTTP ${res.status}`);
                    return res.json();
                })
                .then(rows => {
                    passiveSkillUnitMap = new Map((Array.isArray(rows) ? rows : []).map(item => [item.PassiveKey, item]));
                    return passiveSkillUnitMap;
                })
                .catch(error => {
                    console.error('Failed to load Passive SkillUnits:', error);
                    passiveSkillUnitMap = new Map();
                    return passiveSkillUnitMap;
                });
            return passiveSkillUnitPromise;
        }

        return new Map();
    }

    async function ensureAbilityDescriptions() {
        if (abilityDescriptionMap) return abilityDescriptionMap;
        if (abilityDescriptionPromise) return abilityDescriptionPromise;
        abilityDescriptionPromise = (async function () {
            try {
                const res = await fetch('data/abilities_description_localisation.json');
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const rows = await res.json();
                abilityDescriptionMap = new Map((Array.isArray(rows) ? rows : []).map(item => [item.AbilityKey, item]));
                return abilityDescriptionMap;
            } catch (error) {
                console.error('Failed to load Ability descriptions:', error);
                abilityDescriptionMap = new Map();
                return abilityDescriptionMap;
            }
        })();
        return abilityDescriptionPromise;
    }

    async function ensurePassiveDescriptions() {
        if (passiveDescriptionMap) return passiveDescriptionMap;
        if (passiveDescriptionPromise) return passiveDescriptionPromise;
        passiveDescriptionPromise = (async function () {
            try {
                const res = await fetch('data/passives_description_localisation.json');
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const rows = await res.json();
                passiveDescriptionMap = new Map((Array.isArray(rows) ? rows : []).map(item => [item.PassiveKey, item]));
                return passiveDescriptionMap;
            } catch (error) {
                console.error('Failed to load Passive descriptions:', error);
                passiveDescriptionMap = new Map();
                return passiveDescriptionMap;
            }
        })();
        return passiveDescriptionPromise;
    }

    function getDescriptionEntry(cat, key) {
        if (cat === 'abilities') return abilityDescriptionMap?.get(key) || null;
        if (cat === 'passives') return passiveDescriptionMap?.get(key) || null;
        return null;
    }

    function cleanDescriptionLine(line) {
        return String(line)
            .replace(/<sprite\s+name=["']?[^>"']+["']?\s*>/gi, '')
            .replace(/\\<sprite\s+name=["']?[^>"']+["']?\s*>/gi, '')
            .replace(/\s+/g, ' ')
            .replace(/\s+([。！？,.!?])/g, '$1')
            .trim();
    }

    function cleanLines(lines) {
        if (!Array.isArray(lines)) return [];
        const cleaned = [];
        for (const line of lines) {
            if (typeof line !== 'string' || !line.trim()) continue;
            const text = cleanDescriptionLine(line);
            if (text) cleaned.push(text);
        }
        return cleaned;
    }

    function getLocalisedDescriptionLines(entry) {
        if (!entry) return [];
        const language = typeof currentLang !== 'undefined' ? currentLang : 'English';
        const selected = entry[language];
        const english = entry.English;
        const lines = Array.isArray(selected) && selected.length ? selected : english;
        return cleanLines(lines);
    }

    async function getLiveEnglishLines(cat, key) {
        const engine = await ensureRuntime();
        if (!engine?.resolveEntry) return [];

        const sourceMap = await ensureSkillUnitSource(cat);
        const entry = sourceMap.get(key);
        if (!entry) return [];

        const result = engine.resolveEntry(entry, { kind: cat === 'passives' ? 'passive' : 'ability' });
        return cleanLines(result?.descriptions || []);
    }

    async function getDescriptionLines(cat, key) {
        const locale = String(window.JOBMANIA_LOCALE || 'en').toLowerCase();
        if (locale === 'en') {
            const live = await getLiveEnglishLines(cat, key);
            if (live.length) return live;
        }
        return getLocalisedDescriptionLines(getDescriptionEntry(cat, key));
    }

    async function appendDescription(cat, key) {
        if (cat !== 'abilities' && cat !== 'passives') return;
        const stack = document.querySelector('#content .detail-stack');
        if (!stack) return;
        const lines = await getDescriptionLines(cat, key);
        if (!lines.length) return;

        const section = document.createElement('div');
        section.className = 'card detail-section skill-description-section';
        const heading = document.createElement('h2');
        heading.textContent = window.JOBMANIA_UI?.description || 'Description';
        section.appendChild(heading);

        const list = document.createElement('div');
        list.className = 'skill-description-list';
        lines.forEach(line => {
            const paragraph = document.createElement('p');
            paragraph.className = 'skill-description-line';
            paragraph.textContent = line;
            list.appendChild(paragraph);
        });
        section.appendChild(list);
        stack.appendChild(section);
    }

    const originalLoadDetail = window.loadDetail;
    if (typeof originalLoadDetail === 'function') {
        window.loadDetail = async function (cat, key) {
            const result = await originalLoadDetail.apply(this, arguments);
            const normalizedCat = String(cat).toLowerCase();
            if (normalizedCat === 'abilities') {
                await ensureAbilityDescriptions();
                await appendDescription(normalizedCat, key);
            } else if (normalizedCat === 'passives') {
                await ensurePassiveDescriptions();
                await appendDescription(normalizedCat, key);
            }
            return result;
        };
    }
})();
