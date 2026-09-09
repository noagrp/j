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

  function normalizeLocale(locale) {
    const raw = String(locale || 'en').trim().toLowerCase();
    if (raw === 'zh-cn' || raw === 'zh_hans' || raw === 'zh-hans' || raw === 'simplified chinese') return 'zh-CN';
    if (raw === 'zh-tw' || raw === 'zh_hant' || raw === 'zh-hant' || raw === 'traditional chinese') return 'zh-TW';
    return raw.startsWith('en') || raw === 'english' ? 'en' : locale || 'en';
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

  function normalizeElementId(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';
    const lower = raw.toLowerCase();
    if (mechanicsData?.elementMechanics?.elements?.[lower]) return lower;
    const entries = mechanicsData?.elementMechanics?.elements || {};
    for (const [id, definition] of Object.entries(entries)) {
      if (String(definition?.sourceEffect || '').toLowerCase() === lower) return id;
    }
    return lower;
  }

  function getElementSystem(element) {
    const key = normalizeElementId(element);
    if (!key) return null;
    const shared = mechanicsData?.elementMechanics?.shared || null;
    const specific = mechanicsData?.elementMechanics?.elements?.[key] || null;
    if (!specific) return null;
    return { ...(shared || {}), ...specific, elementId: key };
  }

  function getElementStatus(statusOrElement) {
    const raw = String(statusOrElement || '').trim().toLowerCase();
    if (!raw) return null;
    const statuses = mechanicsData?.elementStatuses || {};
    if (statuses[raw]) return { id: raw, ...statuses[raw] };
    const elementId = normalizeElementId(raw);
    const system = getElementSystem(elementId);
    if (system?.status && statuses[system.status]) return { id: system.status, ...statuses[system.status] };
    for (const [id, definition] of Object.entries(statuses)) {
      if (String(definition?.sourceName || '').toLowerCase() === raw) return { id, ...definition };
    }
    return null;
  }

  function getLocaleBlock(locale) {
    const key = normalizeLocale(locale);
    return localisationData?.locales?.[key] || localisationData?.locales?.en || null;
  }

  function localizeTerm(termKey, locale, fallback) {
    const block = getLocaleBlock(locale);
    return block?.terms?.[termKey] || fallback || termKey;
  }

  function getElementLabel(element, locale) {
    const system = getElementSystem(element);
    if (!system) return String(element || '');
    return localizeTerm(system.termKey, locale, system.sourceEffect || system.elementId);
  }

  function getStatusLabel(status, locale) {
    const definition = getElementStatus(status);
    if (!definition) return String(status || '');
    return localizeTerm(definition.termKey, locale, definition.sourceName || definition.id);
  }

  function getMechanicName(name, locale) {
    const block = getLocaleBlock(locale);
    return block?.mechanicNames?.[name] || name;
  }

  function getElementMechanicName(element, type, locale) {
    const block = getLocaleBlock(locale);
    const templates = block?.nameTemplates || {};
    const template = templates?.[type];
    const elementLabel = getElementLabel(element, locale);
    if (!template) return `${elementLabel} ${type}`;
    return fillTemplate(template, { element: elementLabel });
  }

  function getElementMechanic(element, type, locale) {
    const system = getElementSystem(element);
    if (!system) return null;
    const normalizedType = String(type || '').trim().toLowerCase();
    if (!['element', 'ability', 'finale', 'vulnerable'].includes(normalizedType)) return null;
    return {
      key: `element.${system.elementId}.${normalizedType}`,
      type: normalizedType,
      name: getElementMechanicName(system.elementId, normalizedType, locale || 'en'),
      elementId: system.elementId,
      ...system
    };
  }

  function getElementLinkLabel(element, type, locale) {
    const system = getElementSystem(element);
    if (!system) return '';
    const block = getLocaleBlock(locale);
    const elementLabel = getElementLabel(system.elementId, locale);
    const template = block?.linkTemplates?.[type];
    if (!template) return elementLabel;
    return fillTemplate(template, { element: elementLabel });
  }

  function describeElementStatus(statusOrElement, locale) {
    const status = getElementStatus(statusOrElement);
    if (!status?.mechanicConfirmed) return null;

    const block = getLocaleBlock(locale);
    const templates = block?.templates || {};
    const element = getElementLabel(status.element, locale);
    const common = {
      element,
      max: status.maxStacks,
      upgradeMax: status.upgradeMaxStacks
    };

    if (status.id === 'burn') {
      return fillTemplate(templates.statusBurn, {
        ...common,
        percent: status.damagePercentPerStack
      });
    }

    if (status.id === 'chill') {
      return fillTemplate(templates.statusChill, {
        ...common,
        threshold: status.apReductionThreshold,
        apReduction: status.apReduction,
        enemyMinimumAP: status.enemyMinimumAP,
        sealAt: status.sealPassiveAtStacks,
        sealedTiming: localizeTerm(status.sealedPassiveTimingKey, locale, status.sealedPassiveTimingKey)
      });
    }

    if (status.id === 'paralysis') {
      return fillTemplate(templates.statusParalysis, {
        ...common,
        percent: status.actionFailChancePercentPerStack
      });
    }

    if (status.id === 'seed') {
      return fillTemplate(templates.statusSeed, {
        ...common,
        percent: status.opponentHealPercentOfDamageDealtPerStack
      });
    }

    if (status.id === 'dizzy') {
      const excluded = (status.excludedSkillTermKeys || [])
        .map(key => localizeTerm(key, locale, key))
        .join(', ');
      return fillTemplate(templates.statusDizzy, {
        ...common,
        percent: status.wrongTargetChancePercentPerStack,
        excluded
      });
    }

    if (status.id === 'blind') {
      return fillTemplate(templates.statusBlind, {
        ...common,
        percent: status.attackMissChancePercentPerStack
      });
    }

    if (status.id === 'depress') {
      return fillTemplate(templates.statusDepress, {
        ...common,
        percent: status.healingAndProtectReductionPercentPerStack
      });
    }

    return null;
  }

  function getReusableTemplateValues(definition) {
    const values = {};
    for (const [placeholder, sourceKey] of Object.entries(definition?.templateArgs || {})) {
      values[placeholder] = getPath(definition, sourceKey);
    }
    return values;
  }

  function describeReusableMechanic(name, locale) {
    const status = getElementStatus(name);
    if (status?.mechanicConfirmed) return describeElementStatus(status.id, locale);

    const definition = getEffectDefinition(name);
    if (!definition) return null;
    const block = getLocaleBlock(locale);
    const templates = block?.templates || {};

    if (definition.templateKey) {
      const template = templates[definition.templateKey]
        || localisationData?.locales?.en?.templates?.[definition.templateKey];
      if (template) return fillTemplate(template, getReusableTemplateValues(definition));
    }

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

    return null;
  }

  function formatVulnerableSecondary(system, templates, locale) {
    const secondary = system?.vulnerableSecondary;
    if (!secondary) return '';
    if (secondary.type === 'statusEffectBoost') {
      return fillTemplate(templates.vulnerableStatusBoost, {
        status: getStatusLabel(secondary.status, locale),
        percent: secondary.percent
      });
    }
    if (secondary.type === 'sealPassiveIfStatus') {
      return fillTemplate(templates.vulnerableSealPassive, {
        status: getStatusLabel(secondary.status, locale),
        timing: localizeTerm(secondary.passiveTimingKey, locale, secondary.passiveTimingKey)
      });
    }
    return '';
  }

  function describeElementMechanic(element, type, locale) {
    const system = getElementSystem(element);
    if (!system) return null;
    const block = getLocaleBlock(locale);
    const templates = block?.templates || {};
    const elementLabel = getElementLabel(system.elementId, locale);
    const countersLabel = getElementLabel(system.counters, locale);
    const counteredByLabel = getElementLabel(system.counteredBy, locale);
    const statusLabel = getStatusLabel(system.status, locale);
    const common = {
      element: elementLabel,
      status: statusLabel,
      counters: countersLabel,
      stackBonus: system.abilityBonusPerStack,
      conditionalBonus: system.abilityConditionalDamageBonus,
      upgradedConditionalBonus: system.abilityConditionalDamageBonusUpgraded,
      damageBonus: system.elementNonElementalDamageBonusPerStack,
      reduction: system.elementDamageReductionPerStack,
      max: system.maxStacks,
      upgradeMax: system.upgradeMaxStacks,
      counteredBy: counteredByLabel,
      loseStacks: system.loseStacksWhenCountered,
      threshold: system.finaleThreshold,
      damage: system.finaleDamagePercent,
      maxThreshold: system.finaleMaxThreshold,
      maxDamage: system.finaleMaxDamagePercent
    };

    const normalizedType = String(type || '').trim().toLowerCase();
    if (normalizedType === 'element') return fillTemplate(templates.elementCore, common);
    if (normalizedType === 'ability') return fillTemplate(templates.elementAbilityCore, common);
    if (normalizedType === 'finale') return fillTemplate(templates.elementFinale, common);
    if (normalizedType === 'vulnerable') {
      return fillTemplate(templates.elementVulnerable, {
        element: elementLabel,
        percent: system.vulnerableDamageTakenPercentPerStack,
        secondary: formatVulnerableSecondary(system, templates, locale),
        max: system.vulnerableMaxStacks
      });
    }
    return null;
  }

  function formatAbilityDamage(effect, resolved) {
    if (!resolved) return null;
    const value = resolved.value;
    if (resolved.route === 'powerLv.maxHP') {
      if (!value || typeof value !== 'object') return null;
      return `Deal ${value.enemy}%/${value.player}% MaxHP damage.`;
    }
    if (resolved.route === 'powerLv.stat') return `Deal ${value}% ${effect} damage.`;
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

  function formatElementalDamage(effect, resolved, locale) {
    const system = getElementSystem(effect);
    if (!system || !resolved || resolved.route !== 'powerLv.stat') return null;
    const block = getLocaleBlock(locale || 'en');
    return fillTemplate(block?.templates?.elementalDamage, {
      element: getElementLabel(system.elementId, locale || 'en'),
      percent: resolved.value,
      finale: getElementMechanicName(system.elementId, 'finale', locale || 'en')
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

    Object.values(mechanicsData?.elementMechanics?.elements || {}).forEach((definition) => {
      const effect = definition?.sourceEffect;
      if (!effect || !routeFor('ability', 'Damage', effect)) return;
      engine.registerRule('ability', 'Damage', effect, ({ Multiplier }) => {
        const text = formatElementalDamage(effect, resolve('ability', 'Damage', effect, Multiplier), 'en');
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
    normalizeLocale,
    getEffectDefinition,
    getStatEffectDefinition,
    getElementSystem,
    getElementStatus,
    getElementMechanic,
    getElementMechanicName,
    getElementLinkLabel,
    getElementLabel,
    getStatusLabel,
    localizeTerm,
    describeElementStatus,
    describeReusableMechanic,
    describeElementMechanic,
    getMechanicName,
    getApplyTagLabel,
    formatApplyTags,
    get data() { return mechanicsData; },
    get localisation() { return localisationData; }
  };

  if (typeof document !== 'undefined') load().catch(() => {});
})(typeof globalThis !== 'undefined' ? globalThis : this);
