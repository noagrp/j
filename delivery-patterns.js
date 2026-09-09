/**
 * Jobmania Delivery Pattern Engine
 * Reusable, localisation-ready wording for simple SkillUnit delivery patterns.
 * It does not define the underlying combat mechanic; mechanics.js does that.
 */
(function (root) {
  'use strict';

  let data = null;
  let loadPromise = null;
  let installed = false;

  function normalizeLocale(locale) {
    const raw = String(locale || 'en').trim().toLowerCase();
    if (raw === 'zh-cn' || raw === 'zh_hans' || raw === 'zh-hans' || raw === 'simplified chinese') return 'zh-CN';
    if (raw === 'zh-tw' || raw === 'zh_hant' || raw === 'zh-hant' || raw === 'traditional chinese') return 'zh-TW';
    return raw.startsWith('en') || raw === 'english' ? 'en' : String(locale || 'en');
  }

  function localeBlock(locale) {
    const key = normalizeLocale(locale || root.JOBMANIA_LOCALE || 'en');
    return data?.locales?.[key] || data?.locales?.en || null;
  }

  function localizeTerm(key, locale, fallback) {
    const block = localeBlock(locale);
    return block?.terms?.[key] || data?.locales?.en?.terms?.[key] || fallback || key;
  }

  function template(key, locale) {
    const block = localeBlock(locale);
    return block?.templates?.[key] || data?.locales?.en?.templates?.[key] || '';
  }

  function fill(text, values) {
    return String(text || '').replace(/\{([^}]+)\}/g, (_, key) => values?.[key] == null ? `{${key}}` : String(values[key]));
  }

  function resolveStatus(effect, familyId) {
    const family = data?.families?.[familyId];
    return family?.effects?.[effect] || null;
  }

  function getStatusLabel(statusId, locale) {
    if (root.JobmaniaMechanics?.getStatusLabel) {
      const label = root.JobmaniaMechanics.getStatusLabel(statusId, locale);
      if (label && label !== statusId) return label;
    }
    return localizeTerm(`status.${statusId}`, locale, statusId);
  }

  function describe(kind, skillUnit, effect, multiplier, locale) {
    const families = data?.families || {};
    for (const family of Object.values(families)) {
      const statusId = family?.effects?.[effect];
      if (!statusId) continue;
      const rule = (family.rules || []).find(item => item?.kind === kind && item?.skillUnit === skillUnit);
      if (!rule?.template) continue;
      return fill(template(rule.template, locale), {
        multiplier,
        status: getStatusLabel(statusId, locale),
        effect,
        combatStart: localizeTerm('timing.combatStart', locale, 'Combat Start'),
        startOfTurn: localizeTerm('timing.startOfTurn', locale, 'Start-of-Turn'),
        endOfTurn: localizeTerm('timing.endOfTurn', locale, 'End-of-Turn')
      });
    }
    return null;
  }

  function install(engine) {
    const target = engine || root.JobmaniaSkillUnit;
    if (!target?.registerRule || !data || installed) return false;

    for (const family of Object.values(data.families || {})) {
      const effects = family?.effects || {};
      for (const rule of family?.rules || []) {
        for (const effect of Object.keys(effects)) {
          target.registerRule(rule.kind, rule.skillUnit, effect, ({ Multiplier }) => {
            return describe(rule.kind, rule.skillUnit, effect, Multiplier, root.JOBMANIA_LOCALE || 'en');
          });
        }
      }
    }

    installed = true;
    return true;
  }

  async function load(url) {
    if (data) {
      install();
      return data;
    }
    if (loadPromise) return loadPromise;

    loadPromise = fetch(url || 'data/delivery_patterns.json')
      .then(r => {
        if (!r.ok) throw new Error(`Failed to load delivery patterns: HTTP ${r.status}`);
        return r.json();
      })
      .then(source => {
        data = source;
        install();
        return data;
      })
      .catch(error => {
        console.error(error);
        loadPromise = null;
        return null;
      });

    return loadPromise;
  }

  root.JobmaniaDeliveryPatterns = {
    load,
    install,
    describe,
    resolveStatus,
    getStatusLabel,
    localizeTerm,
    normalizeLocale,
    get data() { return data; }
  };

  load();
})(typeof globalThis !== 'undefined' ? globalThis : window);
