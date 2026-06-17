const db = {};
let currentLang = 'English';
let dictionary = [];

const files = ['abilities', 'jobs', 'monsters', 'passives', 'materials', 'relic'];

// Dictionary
function getDict(key) {
    const entry = dictionary.find(i => i.DictionaryKey === key);
    return entry ? (entry[currentLang] || entry['English'] || key) : key;
}

// Rank Emoji
function getRankEmoji(cat, key, value) {
    if (!value) return "";
    const val = String(value).toLowerCase().trim();
    if (cat === 'jobs' && key === "Rarity") {
        if (val === "1") return " 🟢";
        if (val === "2") return " 🔵";
        if (val === "3") return " 🟣";
        if (val === "4") return " 🔴";
        if (val === "5") return " 🟡";
    }
    if (cat === 'monsters' && key === "Difficulty") {
        if (val.includes("beginner")) return " 🟢";
        if (val.includes("easy")) return " 🔵";
        if (val.includes("medium")) return " 🟣";
        if (val.includes("hard")) return " 🔴";
        if (val.includes("boss")) return " 🟡";
    }
    if (cat === 'abilities' && key === "Ability Tier") {
        if (val === "low") return " 🟢";
        if (val === "medium") return " 🔵";
        if (val === "high") return " 🔴";
        if (val === "master") return " 🟡";
        if (val === "curse") return " ⚪";
    }
    if (cat === 'passives' && key === "Skill Rank") {
        if (val === "low") return " 🟢";
        if (val === "medium") return " 🔵";
        if (val === "high") return " 🔴";
        if (val === "master") return " 🟡";
    }
    return "";
}

function getDisplayKey(cat, originalKey, index = 0) {
    if (!originalKey) return '';
    let key = originalKey.trim();
    if (cat === 'jobs') {
        if (originalKey === "AbilityKey") return "Switch Skill";
        else if (originalKey.includes("AbilityKey")) return "Deck Ability " + originalKey.replace("AbilityKey", "").trim();
    }
    if (cat === 'monsters') {
        if (originalKey.includes("PassiveKey")) return index === 0 ? "Passive" : `Passive ${index + 1}`;
        if (originalKey.includes("AbilityKey")) return index === 0 ? "Ability" : `Ability ${index + 1}`;
        if (originalKey === "MonsterKey") return getDict("character");
    }
    key = key.replace(/Key(_\d+)?$/, '').trim();
    if (key) key = key.charAt(0).toUpperCase() + key.slice(1);
    return key;
}

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

        const dictRes = await fetch('data/dictionary.json');
        if (dictRes.ok) dictionary = await dictRes.json();

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
    let searchHtml = (view !== 'Home') ? `
        <input type="text" id="searchInput" placeholder="${getDict('search')}..."
               style="width:100%; max-width:600px; padding:14px 18px; margin:15px auto 25px; display:block; background:#1a2a5c; color:white; border:2px solid #00aaff; border-radius:12px; font-size:1.05em;">
    ` : '';
    if (view === 'Home') {
        main.innerHTML = `...your home page content...`; // keep your original home
        return;
    }
    const cat = view.toLowerCase();
    const items = db[cat] || [];
    main.innerHTML = `
        <div class="header-card">
            <h1>${view}</h1>
            <p><strong>${items.length} entries</strong></p>
            ${searchHtml}
        </div>
        <div class="grid" id="grid-container"></div>
    `;
    const container = document.getElementById('grid-container');
    const fragment = document.createDocumentFragment();
    items.forEach(item => {
        const nameKey = cat === 'jobs' ? 'JobKey' : cat === 'monsters' ? 'MonsterKey' : null;
        const name = nameKey && item[nameKey] ? item[nameKey] : '';
        let cardHtml = `<div class="card" onclick="toggleExpand(this)">`;
        for (let [k, v] of Object.entries(item)) {
            if (!v || v === "") continue;
            let displayKey = getDisplayKey(cat, k);
            let displayValue = (k.includes("Key") && (cat === 'monsters' || cat === 'jobs' || cat === 'abilities' || cat === 'passives')) 
                ? getTranslation(cat, v) : v;
            let emoji = getRankEmoji(cat, k, v);
            if (k.includes("AbilityKey") && v) {
                cardHtml += `<strong>${displayKey}:</strong> <span class="link" onclick="event.stopImmediatePropagation(); toggleExpand(this.parentElement)">${getTranslation('abilities', v)}</span>${emoji}<br>`;
            } else if (k.includes("PassiveKey") && v) {
                cardHtml += `<strong>${displayKey}:</strong> <span class="link" onclick="event.stopImmediatePropagation(); toggleExpand(this.parentElement)">${getTranslation('passives', v)}</span>${emoji}<br>`;
            } else {
                cardHtml += `<strong>${displayKey}:</strong> ${displayValue}${emoji}<br>`;
            }
        }
        cardHtml += `</div>`;
        const div = document.createElement('div');
        div.innerHTML = cardHtml;
        fragment.appendChild(div.firstElementChild);
    });
    container.appendChild(fragment);
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

// Expand / Collapse Card in place
function toggleExpand(card) {
    card.classList.toggle('expanded');
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

// Fire Cursor Effects (unchanged)
function createFireParticle(x, y) {
    const trail = document.getElementById('fire-trail') || createTrailContainer();
    const particle = document.createElement('div');
    particle.className = 'fire-particle';
    particle.style.left = `${x}px`;
    particle.style.top = `${y}px`;
    particle.style.background = `hsl(${Math.random()*30 + 15}, 100%, 60%)`;
    trail.appendChild(particle);
    setTimeout(() => particle.remove(), 1000);
}
function createTrailContainer() {
    const container = document.createElement('div');
    container.id = 'fire-trail';
    document.body.appendChild(container);
    return container;
}
function createFireBurst(x, y) {
    const burst = document.createElement('div');
    burst.className = 'fire-burst';
    burst.style.left = `${x}px`;
    burst.style.top = `${y}px`;
    document.body.appendChild(burst);
    setTimeout(() => burst.remove(), 600);
}
document.addEventListener('mousemove', (e) => {
    if (Math.random() > 0.35) createFireParticle(e.clientX, e.clientY);
});
document.addEventListener('click', (e) => {
    createFireBurst(e.clientX, e.clientY);
    setTimeout(() => createFireBurst(e.clientX + 12, e.clientY + 8), 60);
    setTimeout(() => createFireBurst(e.clientX - 10, e.clientY - 10), 120);
});

init();
