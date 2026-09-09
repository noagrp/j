/**
 * Jobmania Ability Cost Engine
 * Loads supplemental base AP costs without modifying data/abilities.json.
 * Locale-specific display labels live beside the cost data for easy extension.
 */
(function (root) {
  'use strict';

  let data = null;
  let costMap = new Map();
  let loadPromise = null;

  function normalizeLocale(locale) {
    const raw = String(locale || 'en').trim().toLowerCase();
    if (raw === 'zh-cn' || raw === 'zh_hans' || raw === 'zh-hans' || raw === 'simplified chinese') return 'zh-CN';
    if (raw === 'zh-tw' || raw === 'zh_hant' || raw === 'zh-hant' || raw === 'traditional chinese') return 'zh-TW';
    return raw.startsWith('en') || raw === 'english' ? 'en' : String(locale || 'en');
  }

  function validateAlignment(source, abilities) {
    const alignment = source?.alignment || {};
    if (!Array.isArray(abilities) || !Array.isArray(source?.costs)) return false;
    if (alignment.count != null && abilities.length !== alignment.count) return false;
    if (source.costs.length !== abilities.length) return false;

    for (const anchor of alignment.anchors || []) {
      const index = Number(anchor?.index);
      if (!Number.isInteger(index) || index < 0 || index >= abilities.length) return false;
      if (abilities[index]?.AbilityKey !== anchor.key) return false;
    }
    return true;
  }

  async function load(costUrl, abilitiesUrl) {
    if (data) return data;
    if (loadPromise) return loadPromise;

    loadPromise = Promise.all([
      fetch(costUrl || 'data/ability_costs.json').then(r => {
        if (!r.ok) throw new Error(`Failed to load ability costs: HTTP ${r.status}`);
        return r.json();
      }),
      fetch(abilitiesUrl || 'data/abilities.json').then(r => {
        if (!r.ok) throw new Error(`Failed to load ability keys: HTTP ${r.status}`);
        return r.json();
      })
    ]).then(([source, abilities]) => {
      if (!validateAlignment(source, abilities)) {
        throw new Error('Ability cost data no longer aligns with data/abilities.json. Regenerate ability_costs.json from the Abilities sheet.');
      }

      data = source;
      costMap = new Map();
      abilities.forEach((ability, index) => {
        const key = ability?.AbilityKey;
        if (!key) return;
        const cost = source.costs[index];
        costMap.set(key, cost == null ? null : Number(cost));
      });
      return data;
    }).catch(error => {
      console.error(error);
      loadPromise = null;
      costMap = new Map();
      return null;
    });

    return loadPromise;
  }

  function getCost(abilityKey) {
    if (!costMap.has(abilityKey)) return null;
    const value = costMap.get(abilityKey);
    return Number.isFinite(value) ? value : null;
  }

  function getLabel(locale) {
    const key = normalizeLocale(locale || root.JOBMANIA_LOCALE || 'en');
    const requested = data?.locales?.[key]?.label;
    const english = data?.locales?.en?.label;
    return requested || english || 'AP Cost';
  }

  function getInfo(abilityKey, locale) {
    const cost = getCost(abilityKey);
    if (cost == null) return null;
    return { abilityKey, baseCost: cost, label: getLabel(locale) };
  }

  root.JobmaniaAbilityCost = {
    load,
    getCost,
    getLabel,
    getInfo,
    normalizeLocale,
    get data() { return data; }
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
