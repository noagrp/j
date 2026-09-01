// Jobmania Wiki - Ability / Passive Description Renderer
// Loads pre-generated description localisation JSONs and appends
// one final Description card to expanded Ability and Passive entries.
(function () {
    'use strict';

    let abilityDescriptionMap = new Map();
    let passiveDescriptionMap = new Map();
    let descriptionsReady = false;

    async function loadDescriptionData() {
        try {
            const [abilityRes, passiveRes] = await Promise.all([
                fetch('data/abilities_description_localisation.json'),
                fetch('data/passives_description_localisation.json')
            ]);

            if (abilityRes.ok) {
                const rows = await abilityRes.json();
                abilityDescriptionMap = new Map(
                    (Array.isArray(rows) ? rows : []).map(item => [item.AbilityKey, item])
                );
            }

            if (passiveRes.ok) {
                const rows = await passiveRes.json();
                passiveDescriptionMap = new Map(
                    (Array.isArray(rows) ? rows : []).map(item => [item.PassiveKey, item])
                );
            }
        } catch (error) {
            console.error('Failed to load skill descriptions:', error);
        } finally {
            descriptionsReady = true;
        }
    }

    function getDescriptionEntry(cat, key) {
        if (cat === 'abilities') return abilityDescriptionMap.get(key);
        if (cat === 'passives') return passiveDescriptionMap.get(key);
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

    const descriptionsPromise = loadDescriptionData();
    const originalLoadDetail = window.loadDetail;

    if (typeof originalLoadDetail === 'function') {
        window.loadDetail = async function (cat, key) {
            const result = await originalLoadDetail.apply(this, arguments);
            if (!descriptionsReady) await descriptionsPromise;
            appendDescription(String(cat).toLowerCase(), key);
            return result;
        };
    }
})();
