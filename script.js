const db = {};
let currentLang = 'English';
const files = ['abilities', 'jobs', 'monsters', 'passives', 'materials', 'relic'];
const LinkRegistry = { "AbilityKey": "abilities", "PassiveKey": "passives" };

async function init() {
    for (const f of files) {
        const res = await fetch(`data/${f}.json`);
        db[f] = await res.json();
        // Fetch localisation automatically
        const loc = await fetch(`data/${f}_localisation.json`);
        db[f + '_localisation'] = await loc.json();
    }
    loadView('Home');
}

function getTranslation(category, key) {
    const loc = db[category + '_localisation'];
    const entry = loc?.find(i => Object.values(i)[0] === key);
    return entry ? (entry[currentLang] || entry['English'] || key) : key;
}

function loadView(view) {
    window.lastView = view;
    const main = document.getElementById('content');
    main.innerHTML = `<h1>${view}</h1>`;
    if (view === 'Home') main.innerHTML += "Welcome to Jobmania!";
    else if (db[view.toLowerCase()]) {
        db[view.toLowerCase()].forEach(item => {
            let html = `<div class="card">`;
            for (let [k, v] of Object.entries(item)) {
                if (LinkRegistry[k]) html += `<strong>${k}:</strong> <span class="link" onclick="showPopup('${LinkRegistry[k]}','${v}')">${getTranslation(LinkRegistry[k], v)}</span><br>`;
                else html += `<strong>${k}:</strong> ${v}<br>`;
            }
            main.innerHTML += html + `</div>`;
        });
    }
}

function showPopup(cat, key) {
    const data = db[cat].find(i => Object.values(i)[0] === key);
    const trans = getTranslation(cat, key);
    let html = `<h2>${trans}</h2><button onclick="loadView(window.lastView)">Back</button><div class="card">`;
    for (let [k, v] of Object.entries(data)) html += `<strong>${k}:</strong> ${v}<br>`;
    document.getElementById('content').innerHTML = html + `</div>`;
}

function changeLanguage(lang) { currentLang = lang; loadView(window.lastView); }
init();