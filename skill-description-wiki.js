// Jobmania Wiki - Ability / Passive Description Renderer
// Lazy-loads pre-generated description localisation JSONs and appends
// one final Description card to expanded Ability and Passive entries.
(function () {
    'use strict';

    let abilityDescriptionMap = null;
    let passiveDescriptionMap = null;
    let abilityDescriptionPromise = null;
    let passiveDescriptionPromise = null;

    async function ensureAbilityDescriptions() {
        if (abilityDescriptionMap) return abilityDescriptionMap;
        if (abilityDescriptionPromise) return abilityDescriptionPromise;

        abilityDescriptionPromise = (async function () {
            try {
                const res = await fetch('data/abilities_description_localisation.json');
                if (!res.ok) throw new Error(`HTTP ${res.status}`);

                const rows = await res.json();
                abilityDescriptionMap = new Map(
                    (Array.isArray(rows) ? rows : []).map(item => [item.AbilityKey, item])
                );
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
                passiveDescriptionMap = new Map(
                    (Array.isArray(rows) ? rows : []).map(item => [item.PassiveKey, item])
                );
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

    function getDescriptionLines(entry) {
        if (!entry) return [];

        const language = typeof currentLang !== 'undefined' ? currentLang : 'English';
        const selected = entry[language];
        const english = entry.English;
        const lines = Array.isArray(selected) && selected.length ? selected : english;

        return Array.isArray(lines)
            ? lines.filter(line => typeof line === 'string' && line.trim())
            : [];
    }

    function appendDescription(cat, key) {
        if (cat !== 'abilities' && cat !== 'passives') return;

        const stack = document.querySelector('#content .detail-stack');
        if (!stack) return;

        const lines = getDescriptionLines(getDescriptionEntry(cat, key));
        if (!lines.length) return;

        const section = document.createElement('div');
        section.className = 'card detail-section skill-description-section';

        const heading = document.createElement('h2');
        heading.textContent = 'Description';
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
                appendDescription(normalizedCat, key);
            } else if (normalizedCat === 'passives') {
                await ensurePassiveDescriptions();
                appendDescription(normalizedCat, key);
            }

            return result;
        };
    }
})();
