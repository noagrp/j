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
            db[f] = await res.json();
            const loc = await fetch(`data/${f}_localisation.json`);
            if (loc.ok) db[f + '_localisation'] = await loc.json();
        }
        loadView('Home');
    } catch (e) {
        console.error(e);
        main.innerHTML = `<h1>⚠️ Error</h1><p>Refresh page.</p>`;
    }
}

function getTranslation(category, key) {
    const loc = db[category + '_localisation'];
    const entry = loc?.find(i => Object.values(i)[0] === key);
    return entry ? (entry[currentLang] || entry['English'] || key) : key;
}

// Find who uses this ability/passive
function findUsers(key, type) {
    const users = [];
    const isAbility = type === 'abilities';
    
    // Search in JOBS
    if (db.jobs) {
        db.jobs.forEach(item => {
            for (let [k, v] of Object.entries(item)) {
                if (k.includes(isAbility ? "AbilityKey" : "PassiveKey") && v === key) {
                    if (item.JobKey) users.push({ name: item.JobKey, category: 'jobs' });
                }
            }
        });
    }

    // Search in MONSTERS
    if (db.monsters) {
        db.monsters.forEach(item => {
            for (let [k, v] of Object.entries(item)) {
                if (k.includes(isAbility ? "AbilityKey" : "PassiveKey") && v === key) {
                    if (item.MonsterKey) users.push({ name: item.MonsterKey, category: 'monsters' });
                }
            }
        });
    }

    return users;
}

function loadView(view) {
    window.lastView = view;
    const main = document.getElementById('content');
    main.innerHTML = `
        <h1>${view}</h1>
        <input type="text" id="searchInput" placeholder="Search..." 
               style="width:100%; max-width:500px; padding:10px; margin:10px 0; border-radius:8px; background:#222; color:white; border:1px solid #444;">
    `;

if (view === 'Home') {
    main.innerHTML = `
        <h1>🔥 Jobmania - Eternal Dungeon</h1>
        <div class="home-card">
            <h2>About this game</h2>
            <p><strong>Pick a Hero and a job then embark on an eternal journey of dungeon descending.</strong></p>
            <p>Acquire random abilities and jobs through the journey and build your own unique play style. How far can you go?</p>
            
            <h3>FEATURES</h3>
            <ul>
                <li>Rogue lite, procedural enemies and events generation.</li>
                <li>Dungeon crawler, descend into the dungeon as much as you can.</li>
                <li>Strategic deck building...</li>
                <!-- ... keep all your features ... -->
            </ul>
            
            <p><strong>Join our Discord:</strong> <a href="https://discord.gg/6U5FNFVrwb" target="_blank">https://discord.gg/6U5FNFVrwb</a></p>
        </div>
    `;
    return;
}
    
    const cat = view.toLowerCase();
    const items = db[cat] || [];
    if (items.length === 0) return;

    const fragment = document.createDocumentFragment();
    items.forEach(item => {
        let html = `<div class="card">`;
        for (let [k, v] of Object.entries(item)) {
            if (!v) continue;
            let displayKey = k.replace(/\s*\*\d+/, '');
            if (k.includes("Key")) displayKey = k.replace("Key", "");

            if (k.includes("AbilityKey") && v) {
                html += `<strong>${displayKey}:</strong> <span class="link" onclick="showPopup('abilities','${v}')">${getTranslation('abilities', v)}</span><br>`;
            } else if (k.includes("PassiveKey") && v) {
                html += `<strong>${displayKey}:</strong> <span class="link" onclick="showPopup('passives','${v}')">${getTranslation('passives', v)}</span><br>`;
            } else {
                html += `<strong>${displayKey}:</strong> ${v}<br>`;
            }
        }
        const div = document.createElement('div');
        div.innerHTML = html + `</div>`;
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
        const cards = document.querySelectorAll('.card');
        cards.forEach(card => {
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

    // Main data
    for (let [k, v] of Object.entries(data)) {
        if (!v || v === "") continue;
        let displayKey = k.replace(/\s*\*\d+/, '');
        if (k.includes("Key")) displayKey = k.replace("Key", "");
        html += `<strong>${displayKey}:</strong> ${v}<br>`;
    }

    html += `<hr style="border-color:#444; margin:25px 0 15px;">`;

    // Backlinks - Properly separated
    const jobUsers = users.filter(u => u.category === 'jobs');
    const monsterUsers = users.filter(u => u.category === 'monsters');

    if (jobUsers.length > 0) {
        html += `<strong style="color:#ffd700;">Used by Jobs (${jobUsers.length}):</strong><br><br>`;
        jobUsers.forEach(u => {
            html += `• <span class="link" onclick="showPopup('jobs','${u.name}')">${getTranslation('jobs', u.name)}</span><br>`;
        });
        html += `<br>`;
    }

    if (monsterUsers.length > 0) {
        html += `<strong style="color:#00ffcc;">Used by Monsters (${monsterUsers.length}):</strong><br><br>`;
        monsterUsers.forEach(u => {
            html += `• <span class="link" onclick="showPopup('monsters','${u.name}')">${getTranslation('monsters', u.name)}</span><br>`;
        });
    }

    html += `</div>`;
    document.getElementById('content').innerHTML = html;
}

// Load single category on demand
async function loadData(cat) {
    if (db[cat]) return;
    const res = await fetch(`data/${cat}.json`);
    db[cat] = await res.json();
    const loc = await fetch(`data/${cat}_localisation.json`);
    if (loc.ok) db[cat + '_localisation'] = await loc.json();
}

init();
