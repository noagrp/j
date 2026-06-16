const db = {};
let currentLang = 'English';
const files = ['abilities', 'jobs', 'monsters', 'passives', 'materials', 'relic'];
const LinkRegistry = { "AbilityKey": "abilities", "PassiveKey": "passives" };

async function init() {
    const main = document.getElementById('content');
    main.innerHTML = `<h1>🔥 Jobmania - Eternal Dungeon</h1><p>🔄 Loading data...</p>`;

    try {
        for (const f of files) {
            const res = await fetch(`data/${f}.json`);
            db[f] = await res.json();

            const loc = await fetch(`data/${f}_localisation.json`);
            if (loc.ok) db[f + '_localisation'] = await loc.json();
        }
        loadView('Home');
    } catch (e) {
        console.error(e);
        main.innerHTML = `<h1>⚠️ Loading Error</h1><p>Please refresh the page.</p>`;
    }
}

function getTranslation(category, key) {
    const loc = db[category + '_localisation'];
    const entry = loc?.find(i => Object.values(i)[0] === key);
    return entry ? (entry[currentLang] || entry['English'] || key) : key;
}

function loadView(view) {
    window.lastView = view;
    const main = document.getElementById('content');

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

                <p><strong>Join our Discord:</strong> <a href="https://discord.gg/6U5FNFVrwb" target="_blank" style="color:#4da6ff;">https://discord.gg/6U5FNFVrwb</a></p>
            </div>
        `;
        return;
    }

    // Other views
    const cat = view.toLowerCase();
    const items = db[cat];
    main.innerHTML = `<h1>${view} <small>(${items ? items.length : 0} entries)</small></h1>`;

    if (!items) return;

    const fragment = document.createDocumentFragment();
    items.forEach(item => {
        let html = `<div class="card">`;
        for (let [k, v] of Object.entries(item)) {
            if (!v) continue;
            if (LinkRegistry[k]) {
                html += `<strong>${k}:</strong> <span class="link" onclick="showPopup('${LinkRegistry[k]}','${v}')">${getTranslation(LinkRegistry[k], v)}</span><br>`;
            } else {
                html += `<strong>${k}:</strong> ${v}<br>`;
            }
        }
        const div = document.createElement('div');
        div.innerHTML = html + `</div>`;
        fragment.appendChild(div.firstElementChild);
    });
    main.appendChild(fragment);
}

async function showPopup(cat, key) {
    const data = db[cat]?.find(i => Object.values(i)[0] === key);
    if (!data) return;

    const trans = getTranslation(cat, key);
    let html = `<h2>${trans}</h2>
                <button onclick="loadView(window.lastView)" style="padding:8px 16px; margin:10px 0;">← Back</button>
                <div class="card">`;
    for (let [k, v] of Object.entries(data)) {
        html += `<strong>${k}:</strong> ${v || '—'}<br>`;
    }
    document.getElementById('content').innerHTML = html + `</div>`;
}

function changeLanguage(lang) {
    currentLang = lang;
    if (window.lastView) loadView(window.lastView);
}

init();
