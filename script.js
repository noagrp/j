const db = {};
let currentLang = 'English';
const files = ['abilities', 'jobs', 'monsters', 'passives', 'materials', 'relic'];
const LinkRegistry = { "AbilityKey": "abilities", "PassiveKey": "passives" };

async function init() {
    const main = document.getElementById('content');
    // Using the absolute RAW GitHub URL for your files
    const baseUrl = 'https://raw.githubusercontent.com/noagrp/j/main/data/';

    try {
        for (const f of files) {
            // Fetch main data
            const res = await fetch(baseUrl + f + '.json');
            if (!res.ok) throw new Error(`Failed to load ${f}.json`);
            db[f] = await res.json();
            
            // Fetch localization
            const loc = await fetch(baseUrl + f + '_localisation.json');
            if (loc.ok) db[f + '_localisation'] = await loc.json();
        }
        loadView('Home');
    } catch (err) {
        console.error("Initialization Error:", err);
        main.innerHTML = `<h1>Error Loading Data</h1><p>${err.message}</p>`;
    }
}

function loadView(view) {
    window.lastView = view;
    const main = document.getElementById('content');
    if (view === 'Home') {
        main.innerHTML = `<h1>Welcome to Jobmania Wiki</h1>`;
    } else if (db[view.toLowerCase()]) {
        main.innerHTML = `<h1>${view}</h1>`;
        db[view.toLowerCase()].forEach(item => {
            let html = `<div class="card">`;
            for (let [k, v] of Object.entries(item)) {
                if (LinkRegistry[k]) {
                    html += `<strong>${k}:</strong> <span class="link" onclick="showPopup('${LinkRegistry[k]}','${v}')">${getTranslation(LinkRegistry[k], v)}</span><br>`;
                } else {
                    html += `<strong>${k}:</strong> ${v}<br>`;
                }
            }
            main.innerHTML += html + `</div>`;
        });
    }
}

function getTranslation(category, key) {
    const loc = db[category + '_localisation'];
    if (!loc) return key;
    const entry = loc.find(i => Object.values(i)[0] === key);
    return entry ? (entry[currentLang] || entry['English'] || key) : key;
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
