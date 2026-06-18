const db = {};
const files = ['abilities', 'jobs', 'monsters', 'passives', 'materials', 'relic'];

async function init() {
    const main = document.getElementById('content');
    main.innerHTML = `<h1>🔥 Jobmania Wiki</h1><p>🔄 Loading data...</p>`;
    try {
        for (const f of files) {
            const res = await fetch(`data/${f}.json`);
            if (res.ok) db[f] = await res.json();
        }
        loadView('Home');
    } catch (e) {
        console.error(e);
        main.innerHTML = `<h1>⚠️ Error</h1><p>Please refresh the page.</p>`;
    }
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
                <p><strong>Join our Discord:</strong> <a href="https://discord.gg/6U5FNFVrwb" target="_blank">https://discord.gg/6U5FNFVrwb</a></p>
            </div>
        `;
        return;
    }
    const cat = view.toLowerCase();
    const items = db[cat] || [];
    main.innerHTML = `
        <h1>${view} <small>(${items.length} entries)</small></h1>
        <div class="grid" id="grid-container"></div>
    `;
    const container = document.getElementById('grid-container');
    const fragment = document.createDocumentFragment();
    items.forEach(item => {
        const nameKey = cat === 'jobs' ? 'JobKey' : cat === 'monsters' ? 'MonsterKey' : cat === 'relic' ? 'RelicKey' : null;
        const name = nameKey && item[nameKey] ? item[nameKey] : '';
        let cardHtml = `<div class="card" onclick="showPopup('${cat}','${name}')">`;
        cardHtml += `<h3>${name}</h3>`;
        cardHtml += `</div>`;
        const div = document.createElement('div');
        div.innerHTML = cardHtml;
        fragment.appendChild(div.firstElementChild);
    });
    container.appendChild(fragment);
}

async function showPopup(cat, key) {
    const data = db[cat]?.find(i => Object.values(i)[0] === key);
    if (!data) return;
    let html = `
        <div class="popup">
            <h2>${key}</h2>
            <button onclick="loadView('${cat.charAt(0).toUpperCase() + cat.slice(1)}')">← Back</button>
            <div class="card">
    `;
    for (let [k, v] of Object.entries(data)) {
        if (!v || v === "") continue;
        let displayKey = getDisplayKey(cat, k);
        let emoji = getRankEmoji(cat, k, v);
        if (k.includes("AbilityKey") && v) {
            html += `<strong>${displayKey}:</strong> <span class="link" onclick="showPopup('abilities','${v}')">${v}</span>${emoji}<br>`;
        } else if (k.includes("PassiveKey") && v) {
            html += `<strong>${displayKey}:</strong> <span class="link" onclick="showPopup('passives','${v}')">${v}</span>${emoji}<br>`;
        } else {
            html += `<strong>${displayKey}:</strong> ${v}${emoji}<br>`;
        }
    }
    html += `</div></div>`;
    document.getElementById('content').innerHTML = html;
}

function getDisplayKey(cat, originalKey) {
    if (!originalKey) return '';
    let key = originalKey.replace(/Key(_\d+)?$/, '').trim();
    if (key) key = key.charAt(0).toUpperCase() + key.slice(1);
    if (cat === 'monsters' && originalKey === "MonsterKey") return "Character";
    return key;
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

function switchLanguage(page) {
    window.location.href = page;
}

init();
