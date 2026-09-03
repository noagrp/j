/**
 * Jobmania Mechanics Resolver
 *
 * Expandable data-driven mechanics layer. Current confirmed mechanics:
 * - Ability Damage + Strength/Agility/Intelligence/Protect -> stat Power Lv table
 * - Ability Damage + MaxHP -> MaxHP Power Lv table (enemy/player values)
 * - Ability Heal + MaxHP -> MaxHP Power Lv table (enemy/player values)
 *
 * Balance values live in data/mechanics.json, not in this file.
 */
(function (root) {
  'use strict';

  let mechanicsData = null;
  let mechanicsPromise = null;

  function getPath(object, path) {
    return String(path || '').split('.').filter(Boolean).reduce((value, key) => {
      if (value == null) return undefined;
      return value[key];
    }, object);
  }

  function routeFor(kind, skillUnit, effect) {
    return mechanicsData?.routes?.[kind]?.[skillUnit]?.[effect] || null;
  }

  function resolve(kind, skillUnit, effect, multiplier) {
    const route = routeFor(kind, skillUnit, effect);
    if (!route) return null;

    const table = getPath(mechanicsData, route);
    if (!table) return null;

    const level = String(multiplier);
    const value = table[level];
    if (value == null) return null;

    return {
      route,
      level: multiplier,
      value
    };
  }

  function formatAbilityDamage(effect, resolved) {
    if (!resolved) return null;
    const value = resolved.value;

    if (resolved.route === 'powerLv.maxHP') {
      if (!value || typeof value !== 'object') return null;
      return `Deal ${value.enemy}%/${value.player}% MaxHP damage.`;
    }

    if (resolved.route === 'powerLv.stat') {
      return `Deal ${value}% ${effect} damage.`;
    }

    return null;
  }

  function formatAbilityHeal(effect, resolved) {
    if (!resolved) return null;
    const value = resolved.value;

    if (effect === 'MaxHP' && resolved.route === 'powerLv.maxHP') {
      if (!value || typeof value !== 'object') return null;
      return `Recover ${value.enemy}%/${value.player}% MaxHP.`;
    }

    return null;
  }

  function installRules() {
    const engine = root.JobmaniaSkillUnit;
    if (!engine || typeof engine.registerRule !== 'function' || !mechanicsData) return false;

    ['Strength', 'Agility', 'Intelligence', 'Protect', 'MaxHP'].forEach((effect) => {
      engine.registerRule('ability', 'Damage', effect, ({ Multiplier }) => {
        const resolved = resolve('ability', 'Damage', effect, Multiplier);
        const text = formatAbilityDamage(effect, resolved);
        return text || {
          text: null,
          unresolved: true,
          reason: `No confirmed mechanic value for ability Damage + ${effect} at multiplier ${Multiplier}`
        };
      });
    });

    engine.registerRule('ability', 'Heal', 'MaxHP', ({ Multiplier }) => {
      const resolved = resolve('ability', 'Heal', 'MaxHP', Multiplier);
      const text = formatAbilityHeal('MaxHP', resolved);
      return text || {
        text: null,
        unresolved: true,
        reason: `No confirmed mechanic value for ability Heal + MaxHP at multiplier ${Multiplier}`
      };
    });

    return true;
  }

  function load(url) {
    if (mechanicsData) return Promise.resolve(mechanicsData);
    if (mechanicsPromise) return mechanicsPromise;

    const source = url || 'data/mechanics.json';
    mechanicsPromise = fetch(source)
      .then((response) => {
        if (!response.ok) throw new Error(`Failed to load mechanics data: HTTP ${response.status}`);
        return response.json();
      })
      .then((data) => {
        mechanicsData = data;
        installRules();
        return mechanicsData;
      })
      .catch((error) => {
        mechanicsPromise = null;
        console.error(error);
        throw error;
      });

    return mechanicsPromise;
  }

  root.JobmaniaMechanics = {
    load,
    resolve,
    installRules,
    get data() {
      return mechanicsData;
    }
  };

  if (typeof document !== 'undefined') {
    load().catch(() => {});
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
