/**
 * Jobmania Ability Cost Engine
 * Loads supplemental base AP costs without modifying data/abilities.json.
 * Display wording/localisation is handled by wiki-localisation.js.
 */
(function (root) {
  'use strict';

  let data = null;
  let costMap = new Map();
  let loadPromise = null;

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

  function getInfo(abilityKey) {
    const cost = getCost(abilityKey);
    if (cost == null) return null;
    return { abilityKey, baseCost: cost };
  }

  root.JobmaniaAbilityCost = {
    load,
    getCost,
    getInfo,
    get data() { return data; }
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
