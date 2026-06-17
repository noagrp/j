const db = {};
let currentLang = 'English';
const files = ['abilities', 'jobs', 'monsters', 'passives', 'materials', 'relic'];
const LinkRegistry = { "AbilityKey": "abilities", "PassiveKey": "passives" };

async function init() {
    const main = document.getElementById('content');
    main.innerHTML = `<h1>🔥 Jobmania Wiki</h1><p>🔄 Loading data...</p>`;

    try {
        for (const f of files) {
            const res = await fetch(`data/${f}.json`);
            if (res.ok) db[f] = await res.json();

            const loc = await fetch(`data/${f}_localisation.json`);
            if (loc.ok) db[f + '_localisation'] = await loc.json();
        }
        loadView('Home');
    } catch (e) {
        console.error(e);
        main.innerHTML = `<h1>⚠️ Error</h1><p>Please refresh the page.</p>`;
    }
}

function getTranslation(category, key) {
    const loc = db[category + '_localisation'];
    const entry = loc?.find(i => Object.values(i)[0] === key);
    return entry ? (entry[currentLang] || entry['English'] || key) : key;
}

function findUsers(key, type) {
    const users = [];
    const isAbility = type === 'abilities';
    const cat = isAbility ? 'jobs' : 'monsters';

    if (db[cat]) {
        db[cat].forEach(item => {
            for (let [k, v] of Object.entries(item)) {
                if (k.includes(isAbility ? "AbilityKey" : "PassiveKey") && v === key) {
                    const nameField = isAbility ? 'JobKey' : 'MonsterKey';
                    if (item[nameField]) users.push(item[nameField]);
                }
            }
        });
    }
    return [...new Set(users)];
}

function loadView(view) {
    window.lastView = view;
    const main = document.getElementById('content');

    // Search bar (only on list pages, not Home)
    let searchHtml = '';
    if (view !== 'Home') {
        searchHtml = `
            <input type="text" id="searchInput" placeholder="Search..." 
                   style="width:100%; max-width:500px; padding:10px 14px; margin:15px auto 25px; display:block; background:#1e2f66; color:white; border:1px solid #00aaff; border-radius:8px;">
        `;
    }

    if (view === 'Home') {
        main.innerHTML = `
            <h1>🔥 Jobmania - Eternal Dungeon</h1>
            <div class="home-card">
                <h2>About this game</h2>
                <p><strong>Pick a Hero and a job then embark on an eternal journey of dungeon descending.</strong></p>
                <p>Acquire random abilities and jobs through the journey and build your own unique play style.<br>
                <strong>How far can you go?</strong></p>

                <h3>FEATURES</h3>
                <ul>
                    <li>Rogue lite, procedural enemies and events generation.</li>
                    <li>Dungeon crawler, descend into the dungeon as much as you can.</li>
                    <li>Strategic deck building, build your own unique deck by adding abilities into your deck via chests and defeating enemies.</li>
                    <li>RPG Turn-based combat system, complex but easy to play. Defeat tons of different enemies, challenging but addictive.</li>
                    <li>Equip 3 jobs at once, swap, and use their abilities strategically for powerful synergy.</li>
                    <li>Combine jobs and materials to craft new unique jobs.</li>
                    <li>Get new heroes from Gacha, enemies defeated from the last run will appear in a special Gacha pool!</li>
                    <li>Collect special relics to enhance your build further.</li>
                    <li>A lot of Memes, Anime and Movies references in the game!</li>
                    <li>Free with ads and in-app purchases, remove all ads with one purchase.</li>
                    <li>Portrait screen only, you can play this game with one hand.</li>
                </ul>

                <p><strong>Join our Discord:</strong> <a href="https://discord.gg/6U5FNFVrwb" target="_blank">https://discord.gg/6U5FNFVrwb</a></p>
            </div>
        `;
        return;
    }

    // Other pages (Monsters, Jobs, Abilities, etc.)
    const cat = view.toLowerCase();
    const items = db[cat] || [];
    
    main.innerHTML = `
        <h1>${view} <small>(${items.length} entries)</small></h1>
        ${searchHtml}
    `;

    const fragment = document.createDocumentFragment();
    
    items.forEach(item => {
        const nameKey = cat === 'jobs' ? 'JobKey' : cat === 'monsters' ? 'MonsterKey' : null;
        const name = nameKey && item[nameKey] ? item[nameKey] : '';

        let cardHtml = `<div class="card" onclick="showPopup('${cat}','${name}')" style="cursor:pointer;">`;

        for (let [k, v] of Object.entries(item)) {
            if (!v || v === "") continue;

            let displayKey = k.replace(/\s*\*\d+/, '');   // Remove *5, *3 etc.

            // Special display for Jobs
            if (cat === 'jobs' && k.includes("AbilityKey")) {
                displayKey = "Deck Ability " + k.replace("AbilityKey", "").trim();
            }

            // Special display for Monsters (clean Passive_2, Ability_2)
            if (cat === 'monsters') {
                if (k.includes("_2")) {
                    displayKey = k.replace("_2", "");
                }
            }

            if (k.includes("AbilityKey") && v) {
                cardHtml += `<strong>${displayKey}:</strong> <span class="link" onclick="event.stopImmediatePropagation(); showPopup('abilities','${v}')">${getTranslation('abilities', v)}</span><br>`;
            } 
            else if (k.includes("PassiveKey") && v) {
                cardHtml += `<strong>${displayKey}:</strong> <span class="link" onclick="event.stopImmediatePropagation(); showPopup('passives','${v}')">${getTranslation('passives', v)}</span><br>`;
            } 
            else {
                cardHtml += `<strong>${displayKey}:</strong> ${v}<br>`;
            }
        }

        cardHtml += `</div>`;

        const div = document.createElement('div');
        div.innerHTML = cardHtml;
        fragment.appendChild(div.firstElementChild);
    });

    main.appendChild(fragment);
    attachSearch();
}

    // Other pages - Minimalist search bar
    let html = `
        <h1>${view}</h1>
        <input type="text" id="searchInput" placeholder="Search..." 
               style="width:100%; max-width:500px; padding:10px 14px; margin:15px auto 25px; display:block; background:#1e2f66; color:white; border:1px solid #00aaff; border-radius:8px; font-size:1em;">
    `;

    const cat = view.toLowerCase();
    const items = db[cat] || [];
    main.innerHTML = html + `<small style="display:block; text-align:center; margin-bottom:20px;">(${items.length} entries)</small>`;

    const fragment = document.createDocumentFragment();
    items.forEach(item => {
        const nameKey = cat === 'jobs' ? 'JobKey' : cat === 'monsters' ? 'MonsterKey' : null;
        const name = nameKey ? item[nameKey] : '';

        let cardHtml = `<div class="card" onclick="showPopup('${cat}','${name}')" style="cursor:pointer;">`;
        for (let [k, v] of Object.entries(item)) {
            if (!v) continue;
            let displayKey = k.replace(/\s*\*\d+/, '');
            if (k.includes("Key")) displayKey = displayKey.replace("Key", "");

            if (k.includes("AbilityKey") && v) {
                cardHtml += `<strong>${displayKey}:</strong> <span class="link" onclick="event.stopImmediatePropagation(); showPopup('abilities','${v}')">${getTranslation('abilities', v)}</span><br>`;
            } else if (k.includes("PassiveKey") && v) {
                cardHtml += `<strong>${displayKey}:</strong> <span class="link" onclick="event.stopImmediatePropagation(); showPopup('passives','${v}')">${getTranslation('passives', v)}</span><br>`;
            } else {
                cardHtml += `<strong>${displayKey}:</strong> ${v}<br>`;
            }
        }
        cardHtml += `</div>`;

        const div = document.createElement('div');
        div.innerHTML = cardHtml;
        fragment.appendChild(div.firstElementChild);
    });

    main.appendChild(fragment);
    attachSearch();
}

function attachSearch() {
    const input = document.getElementById('searchInput');
    if (!input) return;
    input.addEventListener('input', () => {
        const term = input.value.toLowerCase().trim();
        document.querySelectorAll('.card').forEach(card => {
            card.style.display = card.textContent.toLowerCase().includes(term) ? '' : 'none';
        });
    });
}

async function showPopup(cat, key) {
    await loadData(cat);
    const data = db[cat]?.find(i => Object.values(i)[0] === key);
    if (!data) return;

    const trans = getTranslation(cat, key);
    const users = findUsers(key, cat);

    let html = `
        <h2>${trans}</h2>
        <button onclick="loadView(window.lastView)" class="back-btn">← Back</button>
        <div class="card">
    `;

    // Main data with clean labels
    for (let [k, v] of Object.entries(data)) {
        if (!v || v === "") continue;

        let displayKey = k.replace(/\s*\*\d+/, '');   // Remove *5, *3 etc.

        // Clean display for Monsters
        if (cat === 'monsters') {
            if (k.includes("_2")) {
                displayKey = k.replace("_2", "");
            }
        }

        // Clean display for Jobs
        if (cat === 'jobs' && k.includes("AbilityKey")) {
            displayKey = "Deck Ability " + k.replace("AbilityKey", "").trim();
        }

        html += `<strong>${displayKey}:</strong> ${v}<br>`;
    }

    // Backlinks section
    html += `<hr style="border-color:#444; margin:25px 0 15px;">`;

    const jobUsers = users.filter(u => db.jobs && db.jobs.some(j => j.JobKey === u));
    const monsterUsers = users.filter(u => db.monsters && db.monsters.some(m => m.MonsterKey === u));

    if (jobUsers.length > 0) {
        html += `<strong style="color:#ffd700;">Used by Jobs (${jobUsers.length}):</strong><br><br>`;
        jobUsers.forEach(job => {
            html += `• <span class="link" onclick="showPopup('jobs','${job}')">${getTranslation('jobs', job)}</span><br>`;
        });
        html += `<br>`;
    }

    if (monsterUsers.length > 0) {
        html += `<strong style="color:#00ffcc;">Used by Monsters (${monsterUsers.length}):</strong><br><br>`;
        monsterUsers.forEach(monster => {
            html += `• <span class="link" onclick="showPopup('monsters','${monster}')">${getTranslation('monsters', monster)}</span><br>`;
        });
    }

    html += `</div>`;
    document.getElementById('content').innerHTML = html;
}

function changeLanguage(lang) {
    currentLang = lang;
    if (window.lastView) loadView(window.lastView);
}

async function loadData(cat) {
    if (db[cat]) return;
    try {
        const res = await fetch(`data/${cat}.json`);
        db[cat] = await res.json();
        const loc = await fetch(`data/${cat}_localisation.json`);
        if (loc.ok) db[cat + '_localisation'] = await loc.json();
    } catch(e) {}
}

init();
