const db = {};
let currentLang = 'English';
let dictionary = [];
let relicLocal = []; // Added for relic localization
const files = ['abilities', 'jobs', 'monsters', 'passives', 'materials', 'relic'];

function getDict(key) {
    const entry = dictionary.find(i => i.DictionaryKey === key);
    return entry ? (entry[currentLang] || entry['English'] || key) : key;
}

// Added to fetch localized names for Relics
function getRelicName(key) {
    const entry = relicLocal.find(i => i.RelicKey === key);
    return entry ? (entry[currentLang] || entry['English'] || key) : key;
}

function changeLanguage(lang) {
    currentLang = lang;
    loadView(window.lastView || 'Home');
}

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
        if (originalKey === "MonsterKey") return "Character";
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
        }
        const dictRes = await fetch('data/dictionary.json');
        if (dictRes.ok) dictionary = await dictRes.json();
        // Load relic localization
        const relicRes = await fetch('data/relic_localisation.json');
        if (relicRes.ok) relicLocal = await relicRes.json();
        
        loadView('Home');
    } catch (e) {
        console.error(e);
        main.innerHTML = `<h1>⚠️ Error</h1><p>Please refresh the page.</p>`;
    }
}

function loadView(view) {
    window.lastView = view;
    const main = document.getElementById('content');
    let searchHtml = (view !== 'Home') ? `
        <input type="text" id="searchInput" placeholder="Search..."
               style="width:100%; max-width:600px; padding:14px 18px; margin:15px auto 25px; display:block; background:#1a2a5c; color:white; border:2px solid #00aaff; border-radius:12px; font-size:1.05em;">
    ` : '';
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
        let cardHtml = `<div class="card" onclick="loadDetail('${cat}', '${Object.values(item)[0]}')">`;
        for (let [k, v] of Object.entries(item)) {
            if (!v || v === "") continue;
            let displayKey = getDisplayKey(cat, k);
            let emoji = getRankEmoji(cat, k, v);
            cardHtml += `<strong>${displayKey}:</strong> ${v}${emoji}<br>`;
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

async function loadDetail(cat, key) {
    const data = db[cat]?.find(i => Object.values(i)[0] === key);
    if (!data) return;
    
    // Check if it's a relic to get localized title
    const title = (cat === 'relic') ? getRelicName(key) : key;

    let html = `
        <button onclick="loadView('${cat.charAt(0).toUpperCase() + cat.slice(1)}')" class="back-btn">← Back</button>
        <div class="card" style="max-width:900px; margin:20px auto;">
            <h2>${title}</h2>
    `;

    for (let [k, v] of Object.entries(data)) {
        if (!v || v === "") continue;
        let displayKey = getDisplayKey(cat, k);
        let emoji = getRankEmoji(cat, k, v);
        
        if ((k.includes("AbilityKey") || k.includes("PassiveKey")) && v) {
            html += `<strong>${displayKey}:</strong> <span class="link" onclick="event.stopPropagation(); loadDetail('${k.includes('Ability') ? 'abilities' : 'passives'}','${v}')">${v}</span>${emoji}<br>`;
        } else {
            html += `<strong>${displayKey}:</strong> ${v}${emoji}<br>`;
        }
    }

    // RELIC INDEPENDENCE: Only show backlinking for non-relic categories
    if (cat !== 'relic') {
        const usedBy = [];
        ['monsters', 'jobs'].forEach(sourceCat => {
            if (db[sourceCat]) {
                db[sourceCat].forEach(item => {
                    const itemName = Object.values(item)[0];
                    if (Object.values(item).includes(key) && itemName !== key) {
                        usedBy.push({ cat: sourceCat, name: itemName });
                    }
                });
            }
        });

        if (usedBy.length > 0) {
            html += `<hr><h3>Used By:</h3>`;
            usedBy.forEach(u => {
                html += `
                    <div class="link" onclick="loadDetail('${u.cat}','${u.name}')" style="margin-bottom: 5px;">
                        ${u.cat === 'monsters' ? '👹' : '⚔️'} ${u.name}
                    </div>`;
            });
        }
    }

    html += `</div>`;
    document.getElementById('content').innerHTML = html;
    window.scrollTo(0, 0);
}

function toggleMenu() { document.querySelector('nav').classList.toggle('open'); }

document.addEventListener('click', (e) => {
    if (e.target.classList.contains('menu-item') && window.innerWidth <= 768) {
        document.querySelector('nav').classList.remove('open');
    }
});

// Cursor effects
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
