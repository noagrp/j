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
    const cat = type === 'abilities' ? 'jobs' : 'monsters'; // mainly jobs for now
    const data = db[cat] || [];
    data.forEach(item => {
        for (let [k, v] of Object.entries(item)) {
            if (k.includes(type === 'abilities' ? 'AbilityKey' : 'PassiveKey') && v === key) {
                const nameKey = cat === 'jobs' ? 'JobKey' : 'MonsterKey';
                users.push(item[nameKey] || item[key]);
            }
        }
    });
    return [...new Set(users)]; // unique
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
        main.innerHTML += `<div class="home-card">... (your home content) ...</div>`;
        attachSearch();
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
    await loadData(cat); // ensure loaded
    const data = db[cat]?.find(i => Object.values(i)[0] === key);
    if (!data) return;

    const trans = getTranslation(cat, key);
    const usersJobs = findUsers(key, cat);
    const usersMonsters = cat === 'abilities' ? findUsers(key, 'abilities') : []; // extend later

    let html = `
        <h2>${trans}</h2>
        <button onclick="loadView(window.lastView)" class="back-btn">← Back</button>
        <div class="card">
    `;

    for (let [k, v] of Object.entries(data)) {
        if (!v) continue;
        let displayKey = k.replace(/\s*\*\d+/, '');
        if (k.includes("Key")) displayKey = k.replace("Key", "");
        
        html += `<strong>${displayKey}:</strong> ${v}<br>`;
    }

    // Backlinks
    if (usersJobs.length > 0) {
        html += `<br><strong>Used by Jobs:</strong><br>`;
        usersJobs.forEach(job => html += `<span class="link" onclick="showPopup('jobs','${job}')">${getTranslation('jobs', job)}</span><br>`);
    }
    if (usersMonsters.length > 0) {
        html += `<br><strong>Used by Monsters:</strong><br>`;
        usersMonsters.forEach(m => html += `<span class="link" onclick="showPopup('monsters','${m}')">${getTranslation('monsters', m)}</span><br>`);
    }

    html += `</div>`;
    document.getElementById('content').innerHTML = html;
}

function changeLanguage(lang) {
    currentLang = lang;
    if (window.lastView) loadView(window.lastView);
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
