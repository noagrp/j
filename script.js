// ====================== GLOBAL FUNCTIONS ======================
const db = {};
let currentLang = 'English';
const files = ['abilities', 'jobs', 'monsters', 'passives', 'materials', 'relic'];
const LinkRegistry = { "AbilityKey": "abilities", "PassiveKey": "passives" };

async function init() {
    const main = document.getElementById('content');
    main.innerHTML = `<h1>🔥 Jobmania Wiki</h1><p>🔄 Loading data...</p>`;

    try {
        for (const f of files) {
            try {
                const res = await fetch(`data/${f}.json`);
                if (res.ok) db[f] = await res.json();

                const loc = await fetch(`data/${f}_localisation.json`);
                if (loc.ok) db[f + '_localisation'] = await loc.json();
            } catch (e) {
                console.warn(`Failed to load ${f}`);
            }
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

// Make changeLanguage global
window.changeLanguage = function(lang) {
    currentLang = lang;
    if (window.lastView) loadView(window.lastView);
};

function loadView(view) {
    window.lastView = view;
    const main = document.getElementById('content');
    main.innerHTML = `<h1>${view}</h1>`;

    if (view === 'Home') {
        main.innerHTML += `<p>Welcome to Jobmania Wiki! Select a category from the left menu.</p>`;
        return;
    }

    const cat = view.toLowerCase();
    const items = db[cat] || [];
    if (items.length === 0) {
        main.innerHTML += `<p>No data available.</p>`;
        return;
    }

    const fragment = document.createDocumentFragment();
    items.forEach(item => {
        let html = `<div class="card">`;
        for (let [k, v] of Object.entries(item)) {
            if (!v) continue;
            let displayKey = k.replace(/\s*\*\d+/, '');
            if (k.includes("Key")) displayKey = displayKey.replace("Key", "");

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
}

async function showPopup(cat, key) {
    // ... (your previous showPopup with backlinks)
    // You can keep the latest version you have
    await loadData(cat);
    const data = db[cat]?.find(i => Object.values(i)[0] === key);
    if (!data) return;

    const trans = getTranslation(cat, key);
    let html = `<h2>${trans}</h2>
                <button onclick="loadView(window.lastView)" class="back-btn">← Back</button>
                <div class="card">`;

    for (let [k, v] of Object.entries(data)) {
        if (!v) continue;
        let displayKey = k.replace(/\s*\*\d+/, '');
        if (k.includes("Key")) displayKey = displayKey.replace("Key", "");
        html += `<strong>${displayKey}:</strong> ${v}<br>`;
    }
    html += `</div>`;
    document.getElementById('content').innerHTML = html;
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

// Start the wiki
init();
