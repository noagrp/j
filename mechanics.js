/**
 * Jobmania Mechanics Resolver
 *
 * Expandable data-driven mechanics layer for Ability/Passive descriptions and
 * reusable combat mechanics. Balance/mechanic data lives in data/mechanics.json;
 * localized names/templates live in data/mechanics_localisation.json.
 */
(function (root) {
  'use strict';

  let mechanicsData = null;
  let mechanicsPromise = null;
  let localisationData = null;
  let localisationPromise = null;

  function getPath(object, path) {
    return String(path || '').split('.').filter(Boolean).reduce((value, key) => {
      if (value == null) return undefined;
      return value[key];
    }, object);
  }

  function fillTemplate(template, values) {
    return String(template || '').replace(/\{([^}]+)\}/g, (_, key) => {
      const value = values?.[key];
      return value == null ? `{${key}}` : String(value);
    });
  }

  function routeFor(kind, skillUnit, effect) {
    return mechanicsData?.routes?.[kind]?.[skillUnit]?.[effect] || null;
  }

  function resolve(kind, skillUnit, effect, multiplier) {
    const route = routeFor(kind, skillUnit, effect);
    if (!route) return null;
    const table = getPath(mechanicsData, route);
    if (!table) return null;
    const value = table[String(multiplier)];
    if (value == null) return null;
    return { route, level: multiplier, value };
  }

  function getEffectDefinition(name) {
    const key = String(name || '').trim();
    return key ? (mechanicsData?.effectDefinitions?.[key] || null) : null;
  }

  function getStatEffectDefinition(skillUnit, effect) {
    const normalizedSkillUnit = String(skillUnit || '').trim();
    const normalizedEffect = String(effect || '').trim();
    const entries = mechanicsData?.effectDefinitions || {};
    for (const [name, definition] of Object.entries(entries)) {
      if (definition?.skillUnit === normalizedSkillUnit && definition?.effect === normalizedEffect) {
        return { name, ...definition };
      }
    }
    return null;
  }

  function getElementSystem(element) {
    const key = String(element || '').trim();
    return key ? (mechanicsData?.elementSystems?.[key] || null) : null;
  }

  function getLocaleBlock(locale) {
    const key = String(locale || 'en');
    return localisationData?.locales?.[key] || localisationData?.locales?.en || null;
  }

  function getMechanicName(name, locale) {
    const block = getLocaleBlock(locale);
    return block?.mechanicNames?.[name] || name;
  }

  function describeReusableMechanic(name, locale) {
    const definition = getEffectDefinition(name);
    if (!definition) return null;
    const block = getLocaleBlock(locale);
    const templates = block?.templates || {};

    if (definition.skillUnit === 'Buff' && ['Strength', 'Agility', 'Intelligence', 'MaxHP'].includes(definition.effect)) {
      return fillTemplate(templates.statBuff, {
        stat: definition.effect,
        percent: Math.abs(definition.changePercentPerStack),
        max: definition.maxStacks,
        upgradeMax: definition.upgradeMaxStacks,
        decrease: definition.decreaseStacks
      });
    }

    if (definition.skillUnit === 'Debuff' && ['Strength', 'Agility', 'Intelligence', 'MaxHP'].includes(definition.effect)) {
      return fillTemplate(templates.statDebuff, {
        stat: definition.effect,
        percent: Math.abs(definition.changePercentPerStack),
        max: definition.maxStacks,
        upgradeMax: definition.upgradeMaxStacks,
        decrease: definition.decreaseStacks
      });
    }

    if (name === 'Burn') {
      return fillTemplate(templates.statusBurn, {
        percent: definition.damagePercentPerStack,
        max: definition.maxStacks,
        upgradeMax: definition.upgradeMaxStacks
      });
    }

    const element = definition.elementSystem;
    const system = getElementSystem(element);
    if (!system) return null;
    const common = {
      element,
      status: system.status,
      finale: system.finale,
      advantageElement: Array.isArray(system.advantageCondition) ? system.advantageCondition.find(v => v !== system.status) : '',
      stackBonus: system.abilityBonusPerStack,
      conditionalBonus: system.abilityConditionalDamageBonus,
      upgradedConditionalBonus: system.abilityConditionalDamageBonusUpgraded,
      damageBonus: system.elementNonElementalDamageBonusPerStack,
      reduction: system.elementDamageReductionPerStack,
      max: system.maxStacks,
      upgradeMax: system.upgradeMaxStacks,
      counteredBy: system.counteredBy,
      loseStacks: system.loseStacksWhenHit,
      threshold: system.finaleThreshold,
      damage: system.finaleDamagePercent,
      maxThreshold: system.finaleMaxThreshold,
      maxDamage: system.finaleMaxDamagePercent
    };
    if (definition.type === 'ApplyTagMechanic') return fillTemplate(templates.elementAbility, common);
    if (definition.type === 'ElementFinale') return fillTemplate(templates.elementFinale, common);
    if (definition.skillUnit === 'Buff') return fillTemplate(templates.elementElement, common);
    return null;
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
    if (resolved.route === 'powerLv.stat') return `Recover ${value}% ${effect} HP.`;
    return null;
  }

  function formatAbilityProtect(effect, resolved) {
    if (!resolved) return null;
    const value = resolved.value;
    if (resolved.route === 'powerLv.maxHP') {
      if (!value || typeof value !== 'object') return null;
      return `Gain ${value.enemy}%/${value.player}% MaxHP Protect.`;
    }
    if (resolved.route === 'powerLv.stat') return `Gain ${value}% ${effect} Protect.`;
    return null;
  }

  function formatElementalDamage(effect, resolved) {
    const system = getElementSystem(effect);
    if (!system || !resolved || resolved.route !== 'powerLv.stat') return null;
    const template = getLocaleBlock('en')?.templates?.elementalDamage;
    return fillTemplate(template, {
      element: effect,
      percent: resolved.value,
      finale: system.finale
    });
  }

  function getApplyTagLabel(rawTag) {
    const key = String(rawTag || '').trim();
    return key ? (mechanicsData?.applyTags?.[key] || key) : null;
  }

  function formatApplyTags(rawTags) {
    if (!Array.isArray(rawTags)) return [];
    return rawTags.map(getApplyTagLabel).filter(Boolean).map(label => `(${label})`);
  }

  function unresolved(kind, skillUnit, effect, multiplier) {
    return { text: null, unresolved: true, reason: `No confirmed mechanic value for ${kind} ${skillUnit} + ${effect} at multiplier ${multiplier}` };
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

    Object.keys(mechanicsData?.elementSystems || {}).forEach((effect) => {
      if (!routeFor('ability', 'Damage', effect)) return;
      engine.registerRule('ability', 'Damage', effect, ({ Multiplier }) => {
        const text = formatElementalDamage(effect, resolve('ability', 'Damage', effect, Multiplier));
        return text || unresolved('ability', 'Damage', effect, Multiplier);
      });
    });

    ['Strength', 'Agility', 'Intelligence', 'MaxHP'].forEach((effect) => {
      engine.registerRule('ability', 'Heal', effect, ({ Multiplier }) => {
        const text = formatAbilityHeal(effect, resolve('ability', 'Heal', effect, Multiplier));
        return text || unresolved('ability', 'Heal', effect, Multiplier);
      });
      engine.registerRule('ability', 'Protect', effect, ({ Multiplier }) => {
        const text = formatAbilityProtect(effect, resolve('ability', 'Protect', effect, Multiplier));
        return text || unresolved('ability', 'Protect', effect, Multiplier);
      });
    });
    return true;
  }

  function loadLocalisation(url) {
    if (localisationData) return Promise.resolve(localisationData);
    if (localisationPromise) return localisationPromise;
    localisationPromise = fetch(url || 'data/mechanics_localisation.json')
      .then(r => { if (!r.ok) throw new Error(`Failed to load mechanics localisation: HTTP ${r.status}`); return r.json(); })
      .then(data => { localisationData = data; return data; })
      .catch(error => { localisationPromise = null; console.error(error); return null; });
    return localisationPromise;
  }

  function load(url) {
    if (mechanicsData) return Promise.resolve(mechanicsData);
    if (mechanicsPromise) return mechanicsPromise;
    mechanicsPromise = Promise.all([
      fetch(url || 'data/mechanics.json').then(r => { if (!r.ok) throw new Error(`Failed to load mechanics data: HTTP ${r.status}`); return r.json(); }),
      loadLocalisation()
    ]).then(([data]) => {
      mechanicsData = data;
      installRules();
      return mechanicsData;
    }).catch(error => {
      mechanicsPromise = null;
      console.error(error);
      throw error;
    });
    return mechanicsPromise;
  }

  root.JobmaniaMechanics = {
    load,
    loadLocalisation,
    resolve,
    installRules,
    getEffectDefinition,
    getStatEffectDefinition,
    getElementSystem,
    getMechanicName,
    describeReusableMechanic,
    getApplyTagLabel,
    formatApplyTags,
    get data() { return mechanicsData; },
    get localisation() { return localisationData; }
  };

  if (typeof document !== 'undefined') load().catch(() => {});
})(typeof globalThis !== 'undefined' ? globalThis : this);
