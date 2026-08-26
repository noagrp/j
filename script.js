const db = {};
let currentLang = 'English';
let dictionary = [];
let relicLocal = [];
const files = ['abilities', 'jobs', 'monsters', 'passives', 'materials', 'relic', 'jobcraft'];
let detailHistory = [];
let currentDetail = null;

const monsterStructuredFields = new Set(['Random Passives', 'Random Abilities', 'Threshold Abilities', 'Special Case Abilities']);

function getDict(key) { const entry = dictionary.find(i => i.DictionaryKey === key); return entry ? (entry[currentLang] || entry['English'] || key) : key; }
function getRelicName(key) { const entry = relicLocal.find(i => i.RelicKey === key); return entry ? (entry[currentLang] || entry['English'] || key) : key; }
function changeLanguage(lang) { currentLang = lang; loadView(window.lastView || 'Home'); }
function escapeHtml(value) { return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\"/g, '&quot;').replace(/'/g, '&#039;'); }
function detailLink(cat, name) { if (!name) return ''; return `<span class="link" data-cat="${escapeHtml(cat)}" data-key="${escapeHtml(name)}" onclick="event.stopPropagation(); loadDetail(this.dataset.cat, this.dataset.key)">${escapeHtml(name)}</span>`; }
function infoRow(label, valueHtml, extraClass = '') { if (!valueHtml && valueHtml !== 0) return ''; return `<div class="info-row ${extraClass}"><div class="info-label">${escapeHtml(label)}:</div><div class="info-value">${valueHtml}</div></div>`; }
function hasStructuredValue(value) { if (Array.isArray(value)) return value.length > 0; if (value && typeof value === 'object') return Object.values(value).some(v => hasStructuredValue(v)); return value !== null && value !== undefined && value !== ''; }
function renderLinkedList(values, cat) { if (!Array.isArray(values) || values.length === 0) return ''; return values.map(value => detailLink(cat, value)).join('<span class="skill-separator"> · </span>'); }
function renderTieredAbilities(value) { if (!value || typeof value !== 'object' || Array.isArray(value)) return ''; return Object.entries(value).filter(([, abilities]) => Array.isArray(abilities) && abilities.length > 0).map(([label, abilities]) => infoRow(label, renderLinkedList(abilities, 'abilities'), 'skill-row')).join(''); }
function renderSpecialCaseAbilities(value) { if (!Array.isArray(value) || value.length === 0) return ''; return value.filter(item => item && Array.isArray(item.abilities) && item.abilities.length > 0).map(item => infoRow(item.condition || 'Condition', renderLinkedList(item.abilities, 'abilities'), 'skill-row')).join(''); }
function renderAbilityIcon(iconKey, altText, sizeClass) { if (!iconKey) return ''; return `<div class="card-media ${sizeClass}"><img src="iconimage/${encodeURIComponent(iconKey)}.png" alt="${escapeHtml(altText)}"></div>`; }
function renderMaterialImage(materialKey, sizeClass) { if (!materialKey) return ''; return `<div class="card-media ${sizeClass}"><img src="materialsprite/${encodeURIComponent(materialKey)}.png" alt="${escapeHtml(materialKey)}" onerror="this.style.display='none'"></div>`; }

function normalizeMaterialCombineList(material) {
    if (!material) return material;
    const raw = material['Combine List'];
    if (Array.isArray(raw)) return material;
    material['Combine List'] = raw ? String(raw).split('|').filter(Boolean).map(entry => {
        const separator = entry.indexOf('-');
        if (separator < 0) return null;
        return { Job: entry.slice(0, separator).trim(), Result: entry.slice(separator + 1).trim() };
    }).filter(item => item && item.Job && item.Result) : [];
    return material;
}
function normalizeMaterialData() { if (Array.isArray(db.materials)) db.materials = db.materials.map(normalizeMaterialCombineList); }
function renderMaterialCombineList(value) {
    if (!Array.isArray(value) || value.length === 0) return '';
    return value.map(item => `<div class="material-combine-row">${detailLink('jobs', item.Job)}<span class="material-combine-arrow">→</span>${detailLink('jobs', item.Result)}</div>`).join('');
}

function craftEntityLink(cat, name) {
    if (!name) return '';
    const exists = (db[cat] || []).some(item => Object.values(item)[0] === name);
    return exists ? detailLink(cat, name) : `<span>${escapeHtml(name)}</span>`;
}

function findCraftingPath(jobKey, visited = new Set()) {
    if (jobKey === 'Jobless') return [];
    if (visited.has(jobKey)) return null;
    const nextVisited = new Set(visited);
    nextVisited.add(jobKey);
    const incoming = (db.jobcraft || []).filter(recipe => recipe.ToJobKey === jobKey);
    for (const recipe of incoming) {
        const parentPath = findCraftingPath(recipe.FromJobKey, nextVisited);
        if (parentPath !== null) return [...parentPath, recipe];
    }
    return null;
}

function renderCraftRecipe(recipe) {
    return `<div class="craft-row">${craftEntityLink('jobs', recipe.FromJobKey)}<span class="craft-plus">+</span>${craftEntityLink('materials', recipe.MaterialKey)}<span class="craft-arrow">→</span>${craftEntityLink('jobs', recipe.ToJobKey)}</div>`;
}

function renderCraftingPath(jobKey) {
    if (jobKey === 'Jobless') return '';
    const path = findCraftingPath(jobKey);
    if (!Array.isArray(path) || path.length === 0) return '';
    return `<div class="craft-list">${path.map(renderCraftRecipe).join('')}</div>`;
}

function renderCraftsInto(jobKey) {
    const recipes = (db.jobcraft || []).filter(recipe => recipe.FromJobKey === jobKey);
    if (recipes.length === 0) return '';
    return `<div class="craft-list">${recipes.map(renderCraftRecipe).join('')}</div>`;
}

function renderMonsterSkillPools(data) {
    const groups = [];
    if (hasStructuredValue(data['Random Passives'])) groups.push(`<div class="skill-group">${infoRow('Random Passives', renderLinkedList(data['Random Passives'], 'passives'), 'skill-row')}</div>`);
    if (hasStructuredValue(data['Random Abilities'])) { const rows = renderTieredAbilities(data['Random Abilities']); if (rows) groups.push(`<div class="skill-group"><h3>Random Abilities</h3>${rows}</div>`); }
    if (hasStructuredValue(data['Threshold Abilities'])) { const rows = renderTieredAbilities(data['Threshold Abilities']); if (rows) groups.push(`<div class="skill-group"><h3>Threshold Abilities</h3>${rows}</div>`); }
    if (hasStructuredValue(data['Special Case Abilities'])) { const rows = renderSpecialCaseAbilities(data['Special Case Abilities']); if (rows) groups.push(`<div class="skill-group"><h3>Special Case Abilities</h3>${rows}</div>`); }
    return groups.join('');
}

function splitKnownNames(raw, cat) {
    if (!raw) return [];
    const source = String(raw).replace(/--+/g, '-');
    const keyField = cat === 'passives' ? 'PassiveKey' : 'AbilityKey';
    const names = (db[cat] || []).map(item => item[keyField] || Object.values(item)[0]).filter(Boolean).sort((a, b) => b.length - a.length);
    const memo = new Map();
    function parseAt(index) {
        if (index === source.length) return [];
        if (memo.has(index)) return memo.get(index);
        for (const name of names) {
            const slice = source.slice(index, index + name.length);
            if (slice.toLowerCase() !== String(name).toLowerCase()) continue;
            const next = index + name.length;
            if (next === source.length) { const result = [name]; memo.set(index, result); return result; }
            if (source[next] === '-') { const tail = parseAt(next + 1); if (tail) { const result = [name, ...tail]; memo.set(index, result); return result; } }
        }
        memo.set(index, null); return null;
    }
    return parseAt(0) || source.split('-').filter(Boolean);
}

function normalizeMonsterSkillPools(monster) {
    if ('Passives' in monster && !('Random Passives' in monster)) { monster['Random Passives'] = splitKnownNames(monster.Passives, 'passives'); delete monster.Passives; }
    if (typeof monster['Random Abilities'] === 'string') { const parts = monster['Random Abilities'].split('|'); const labels = ['100%', '99% to 50%', '49% to 30%', '29% to 1%']; monster['Random Abilities'] = Object.fromEntries(labels.map((label, index) => [label, splitKnownNames(parts[index] || '', 'abilities')])); }
    if (typeof monster['Threshold Abilities'] === 'string') { const parts = monster['Threshold Abilities'].split('|'); const labels = ['Enemy act first', 'Below 50%', 'Below 30%']; monster['Threshold Abilities'] = Object.fromEntries(labels.map((label, index) => [label, splitKnownNames(parts[index] || '', 'abilities')])); }
    if (typeof monster['Special Case Abilities'] === 'string') { monster['Special Case Abilities'] = monster['Special Case Abilities'] ? monster['Special Case Abilities'].split('|').filter(Boolean).map(entry => { const separator = entry.indexOf(':'); const condition = separator >= 0 ? entry.slice(0, separator).trim() : ''; const skills = separator >= 0 ? entry.slice(separator + 1) : entry; return { condition, abilities: splitKnownNames(skills, 'abilities') }; }) : []; }
    return monster;
}
function normalizeMonsterData() { if (Array.isArray(db.monsters)) db.monsters = db.monsters.map(normalizeMonsterSkillPools); }

function getRankEmoji(cat, key, value) {
    if (!value) return '';
    const val = String(value).toLowerCase().trim();
    if (cat === 'jobs' && key === 'Rarity') return ({'1':' ⭐','2':' ⭐⭐','3':' ⭐⭐⭐','4':' ⭐⭐⭐⭐','5':' ⭐⭐⭐⭐⭐'})[val] || '';
    if (cat === 'monsters' && key === 'Difficulty') { if (val.includes('beginner')) return ' ⭐'; if (val.includes('easy')) return ' ⭐⭐'; if (val.includes('medium')) return ' ⭐⭐⭐'; if (val.includes('hard')) return ' ⭐⭐⭐⭐'; if (val.includes('boss')) return ' ⭐⭐⭐⭐⭐'; }
    if (cat === 'abilities' && key === 'Ability Tier') return ({low:' ⭐',medium:' ⭐⭐',high:' ⭐⭐⭐',master:' ⭐⭐⭐⭐',curse:' ⭐'})[val] || '';
    if (cat === 'passives' && key === 'Skill Rank') return ({low:' ⭐',medium:' ⭐⭐',high:' ⭐⭐⭐',master:' ⭐⭐⭐⭐'})[val] || '';
    return '';
}

function getDisplayKey(cat, originalKey) {
    if (!originalKey) return '';
    let key = originalKey.trim();
    if (cat === 'jobs') { if (originalKey === 'AbilityKey') return 'Switch Skill'; if (originalKey.includes('AbilityKey')) return 'Deck Ability ' + originalKey.replace('AbilityKey', '').trim(); }
    if (cat === 'monsters') {
        if (originalKey.includes('PassiveKey')) { const match = originalKey.match(/\d+/); return `Passive${match ? parseInt(match[0]) : 1}`; }
        if (originalKey.includes('AbilityKey')) { const match = originalKey.match(/\d+/); return `Ability${match ? parseInt(match[0]) : 1}`; }
        if (originalKey === 'MonsterKey') return 'Character';
    }
    key = key.replace(/Key(_\d+)?$/, '').trim(); if (key) key = key.charAt(0).toUpperCase() + key.slice(1); return key;
}

function renderFieldValue(cat, key, value, clickable = false) {
    const emoji = getRankEmoji(cat, key, value);
    if (emoji) return escapeHtml(emoji.trim());
    if (clickable && (key.includes('AbilityKey') || key.includes('PassiveKey'))) return detailLink(key.includes('Ability') ? 'abilities' : 'passives', value);
    return escapeHtml(value);
}

async function init() {
    const main = document.getElementById('content'); main.innerHTML = `<h1>🔥 Jobmania Wiki</h1><p>🔄 Loading data...</p>`;
    try {
        for (const f of files) { const res = await fetch(`data/${f}.json`); if (res.ok) db[f] = await res.json(); }
        const dictRes = await fetch('data/dictionary.json'); if (dictRes.ok) dictionary = await dictRes.json();
        const relicRes = await fetch('data/relic_localisation.json'); if (relicRes.ok) relicLocal = await relicRes.json();
        normalizeMonsterData(); normalizeMaterialData(); loadView('Home');
    } catch (e) { console.error(e); main.innerHTML = `<h1>⚠️ Error</h1><p>Please refresh the page.</p>`; }
}

function loadView(view) {
    detailHistory = []; currentDetail = null; window.lastView = view;
    const main = document.getElementById('content');
    const searchHtml = view !== 'Home' ? `<input type="text" id="searchInput" placeholder="Search...">` : '';
    if (view === 'Home') {
        main.innerHTML = `<h1>🔥 Jobmania - Eternal Dungeon</h1><div class="home-card"><h2>About this game</h2><p><strong>Pick a Hero and a job then embark on an eternal journey of dungeon descending.</strong></p><p>Acquire random abilities and jobs through the journey and build your own unique play style.<br><strong>How far can you go?</strong></p><h3>FEATURES</h3><ul><li>Rogue lite, procedural enemies and events generation.</li><li>Dungeon crawler, descend into the dungeon as much as you can.</li><li>Strategic deck building, build your own unique deck by adding abilities into your deck via chests and defeating enemies.</li><li>RPG Turn-based combat system, complex but easy to play. Defeat tons of different enemies, challenging but addictive.</li><li>Equip 3 jobs at once, swap, and use their abilities strategically for powerful synergy.</li><li>Combine jobs and materials to craft new unique jobs.</li><li>Get new heroes from Gacha, enemies defeated from the last run will appear in a special Gacha pool!</li><li>Collect special relics to enhance your build further.</li><li>A lot of Memes, Anime and Movies references in the game!</li><li>Free with ads and in-app purchases, remove all ads with one purchase.</li><li>Portrait screen only, you can play this game with one hand.</li></ul><p><strong>Join our Discord:</strong> <a href="https://discord.gg/6U5FNFVrwb" target="_blank">https://discord.gg/6U5FNFVrwb</a></p></div>`; return;
    }
    const cat = view.toLowerCase(); const items = db[cat] || [];
    main.innerHTML = `<div class="header-card"><h1>${escapeHtml(view)}</h1><p><strong>${items.length} entries</strong></p>${searchHtml}</div><div class="grid" id="grid-container"></div>`;
    const container = document.getElementById('grid-container'); const fragment = document.createDocumentFragment();
    items.forEach(item => {
        const itemKey = Object.values(item)[0];
        let cardHtml = `<div class="card list-card" data-key="${escapeHtml(itemKey)}" onclick="loadDetail('${cat}', this.dataset.key)">`;
        if (cat === 'monsters') cardHtml += `<div class="card-media card-media-compact"><img src="charactersprite/${encodeURIComponent(itemKey)}.png" alt="${escapeHtml(itemKey)}"></div>`;
        if (cat === 'abilities') cardHtml += renderAbilityIcon(item.IconImage, itemKey, 'card-media-compact');
        if (cat === 'materials') cardHtml += renderMaterialImage(itemKey, 'card-media-compact');
        cardHtml += `<div class="info-list">`;
        for (const [k, v] of Object.entries(item)) { if (!v || v === '') continue; if (cat === 'monsters' && monsterStructuredFields.has(k)) continue; if (cat === 'abilities' && k === 'IconImage') continue; if (cat === 'materials' && k === 'Combine List') continue; cardHtml += infoRow(getDisplayKey(cat, k), renderFieldValue(cat, k, v, false)); }
        cardHtml += `</div></div>`;
        const div = document.createElement('div'); div.innerHTML = cardHtml; fragment.appendChild(div.firstElementChild);
    });
    container.appendChild(fragment); attachSearch();
}

function attachSearch() { const input = document.getElementById('searchInput'); if (!input) return; input.addEventListener('input', () => { const term = input.value.toLowerCase().trim(); document.querySelectorAll('.list-card').forEach(card => { card.style.display = card.textContent.toLowerCase().includes(term) ? '' : 'none'; }); }); }

async function loadDetail(cat, key, fromHistory = false) {
    const data = db[cat]?.find(i => Object.values(i)[0] === key); if (!data) return;
    if (!fromHistory && currentDetail) detailHistory.push(currentDetail); currentDetail = { cat, key };
    const title = cat === 'relic' ? getRelicName(key) : key;
    let detailMedia = '';
    if (cat === 'monsters') detailMedia = `<div class="card-media card-media-detail"><img src="charactersprite/${encodeURIComponent(key)}.png" alt="${escapeHtml(title)}"></div>`;
    if (cat === 'abilities') detailMedia = renderAbilityIcon(data.IconImage, title, 'card-media-detail');
    if (cat === 'materials') detailMedia = renderMaterialImage(key, 'card-media-detail');
    let html = `<button onclick="goBackToPreviousDetail()" class="back-btn">← Back</button><div class="detail-stack"><div class="card detail-title-card">${detailMedia}<h3>${escapeHtml(title)}</h3></div>`;
    let basicHtml = `<div class="card detail-section"><h2>Basic Info</h2><div class="info-list">`;
    let extraHtml = `<div class="card detail-section"><h2>More Info</h2><div class="info-list">`; let hasExtra = false;
    Object.entries(data).forEach(([k, v], idx) => {
        if (cat === 'monsters' && monsterStructuredFields.has(k)) return; if (cat === 'abilities' && k === 'IconImage') return; if (cat === 'materials' && (k === 'MaterialKey' || k === 'Combine List')) return; if (!v || v === '') return;
        const line = infoRow(getDisplayKey(cat, k), renderFieldValue(cat, k, v, true));
        if (idx < 6) basicHtml += line; else { extraHtml += line; hasExtra = true; }
    });
    basicHtml += `</div></div>`; extraHtml += `</div></div>`; html += basicHtml; if (hasExtra) html += extraHtml;
    if (cat === 'materials' && hasStructuredValue(data['Combine List'])) { const combineRows = renderMaterialCombineList(data['Combine List']); if (combineRows) html += `<div class="card detail-section"><h2>Combine List</h2><div class="material-combine-guide"><strong>${escapeHtml(key)} + Job → Crafted Job</strong></div><div class="material-combine-list">${combineRows}</div></div>`; }
    if (cat === 'monsters') { const skillPools = renderMonsterSkillPools(data); if (skillPools) html += `<div class="card detail-section skill-pools"><h2>Enemy Skill Pools</h2>${skillPools}</div>`; }
    if (cat !== 'relic' && cat !== 'materials') {
        const usedBy = [];
        ['monsters', 'jobs'].forEach(sourceCat => { (db[sourceCat] || []).forEach(item => { const itemName = Object.values(item)[0]; if (Object.values(item).includes(key) && itemName !== key) usedBy.push({ cat: sourceCat, name: itemName }); }); });
        if (usedBy.length > 0) { html += `<div class="card detail-section"><h2>Used By</h2><div class="used-by-list">`; usedBy.forEach(u => { html += `<div class="used-by-item link" data-cat="${escapeHtml(u.cat)}" data-key="${escapeHtml(u.name)}" onclick="loadDetail(this.dataset.cat, this.dataset.key)">${u.cat === 'monsters' ? '👹' : '⚔️'} ${escapeHtml(u.name)}</div>`; }); html += `</div></div>`; }
    }
    if (cat === 'jobs') {
        const craftingPath = renderCraftingPath(key);
        if (craftingPath) html += `<div class="card detail-section"><h2>Crafting Path</h2>${craftingPath}</div>`;
        const craftsInto = renderCraftsInto(key);
        if (craftsInto) html += `<div class="card detail-section"><h2>Crafts Into</h2>${craftsInto}</div>`;
    }
    html += `</div>`; document.getElementById('content').innerHTML = html; window.scrollTo(0, 0);
}

function goBackToPreviousDetail() { const previousDetail = detailHistory.pop(); if (previousDetail) { loadDetail(previousDetail.cat, previousDetail.key, true); return; } if (currentDetail) { const categoryView = currentDetail.cat.charAt(0).toUpperCase() + currentDetail.cat.slice(1); loadView(categoryView); } }
function toggleMenu() { document.querySelector('nav').classList.toggle('open'); }
document.addEventListener('click', e => { if (e.target.classList.contains('menu-item') && window.innerWidth <= 768) document.querySelector('nav').classList.remove('open'); });
function createFireParticle(x, y) { const trail = document.getElementById('fire-trail') || createTrailContainer(); const particle = document.createElement('div'); particle.className = 'fire-particle'; particle.style.left = `${x}px`; particle.style.top = `${y}px`; particle.style.background = `hsl(${Math.random()*30 + 15}, 100%, 60%)`; trail.appendChild(particle); setTimeout(() => particle.remove(), 1000); }
function createTrailContainer() { const container = document.createElement('div'); container.id = 'fire-trail'; document.body.appendChild(container); return container; }
function createFireBurst(x, y) { const burst = document.createElement('div'); burst.className = 'fire-burst'; burst.style.left = `${x}px`; burst.style.top = `${y}px`; document.body.appendChild(burst); setTimeout(() => burst.remove(), 600); }
document.addEventListener('mousemove', e => { if (Math.random() > 0.35) createFireParticle(e.clientX, e.clientY); });
document.addEventListener('click', e => { createFireBurst(e.clientX, e.clientY); setTimeout(() => createFireBurst(e.clientX + 12, e.clientY + 8), 60); setTimeout(() => createFireBurst(e.clientX - 10, e.clientY - 10), 120); });
init();