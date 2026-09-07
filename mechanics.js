/**
 * Jobmania Mechanics Resolver
 *
 * Expandable data-driven mechanics layer. Current confirmed mechanics:
 * - Ability Damage + Strength/Agility/Intelligence/Protect -> stat Power Lv table
 * - Ability Damage + MaxHP -> MaxHP Power Lv table (enemy/player values)
 * - Ability Heal + Strength/Agility/Intelligence -> stat Power Lv table
 * - Ability Heal + MaxHP -> MaxHP Power Lv table (enemy/player values)
 * - Ability Protect + Strength/Agility/Intelligence -> stat Power Lv table
 * - Ability Protect + MaxHP -> MaxHP Power Lv table (enemy/player values)
 * - Apply1-Apply4 tags resolve through mechanics.json to player-facing effect names
 *
 * Balance values and Apply-tag labels live in data/mechanics.json, not in this file.
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

    if (resolved.route === 'powerLv.maxHP') {
      if (!value || typeof value !== 'object') return null;
      return `Recover ${value.enemy}%/${value.player}% MaxHP.`;
    }

    if (resolved.route === 'powerLv.stat') {
      return `Recover ${value}% ${effect} HP.`;
    }

    return null;
  }

  function formatAbilityProtect(effect, resolved) {
    if (!resolved) return null;
    const value = resolved.value;

    if (resolved.route === 'powerLv.maxHP') {
      if (!value || typeof value !== 'object') return null;
      return `Gain ${value.enemy}%/${value.player}% MaxHP Protect.`;
    }

    if (resolved.route === 'powerLv.stat') {
      return `Gain ${value}% ${effect} Protect.`;
    }

    return null;
  }

  function getApplyTagLabel(rawTag) {
    const key = String(rawTag || '').trim();
    if (!key) return null;
    return mechanicsData?.applyTags?.[key] || key;
  }

  function formatApplyTags(rawTags) {
    if (!Array.isArray(rawTags)) return [];
    return rawTags
      .map(getApplyTagLabel)
      .filter(Boolean)
      .map(label => `(${label})`);
  }

  function unresolved(kind, skillUnit, effect, multiplier) {
    return {
      text: null,
      unresolved: true,
      reason: `No confirmed mechanic value for ${kind} ${skillUnit} + ${effect} at multiplier ${multiplier}`
    };
  }

  function installRules() {
    const engine = root.JobmaniaSkillUnit;
    if (!engine || typeof engine.registerRule !== 'function' || !mechanicsData) return false;

    ['Strength', 'Agility', 'Intelligence', 'Protect', 'MaxHP'].forEach((effect) => {
      engine.registerRule('ability', 'Damage', effect, ({ Multiplier }) => {
        const text = formatAbilityDamage(effect, resolve('ability', 'Damage', effect, Multiplier));
        return text || unresolved('ability', 'Damage', effect, Multiplier);
      });
    });

    ['Strength', 'Agility', 'Intelligence', 'MaxHP'].forEach((effect) => {
      engine.registerRule('ability', 'Heal', effect, ({ Multiplier }) => {
        const text = formatAbilityHeal(effect, resolve('ability', 'Heal', effect, Multiplier));
        return text || unresolved('ability', 'Heal', effect, Multiplier);
      });
    });

    ['Strength', 'Agility', 'Intelligence', 'MaxHP'].forEach((effect) => {
      engine.registerRule('ability', 'Protect', effect, ({ Multiplier }) => {
        const text = formatAbilityProtect(effect, resolve('ability', 'Protect', effect, Multiplier));
        return text || unresolved('ability', 'Protect', effect, Multiplier);
      });
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
    getApplyTagLabel,
    formatApplyTags,
    get data() {
      return mechanicsData;
    }
  };

  if (typeof document !== 'undefined') {
    load().catch(() => {});
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
