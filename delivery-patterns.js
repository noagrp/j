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

  function describe(kind, skillUnit, effect, multiplier, locale) {
    const families = data?.families || {};
    for (const [familyId, family] of Object.entries(families)) {
      const status = family?.effects?.[effect];
      if (!status) continue;
      const rule = (family.rules || []).find(item => item?.kind === kind && item?.skillUnit === skillUnit);
      if (!rule?.template) continue;
      return fill(template(rule.template, locale), {
        multiplier,
        status,
        effect
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

  // skillunit.js is loaded lazily by the wiki description renderer. If this
  // engine is already present, install as soon as JobmaniaSkillUnit appears.
  let attempts = 0;
  const timer = setInterval(() => {
    attempts += 1;
    if (root.JobmaniaSkillUnit && data) {
      install(root.JobmaniaSkillUnit);
      clearInterval(timer);
    } else if (attempts >= 200) {
      clearInterval(timer);
    }
  }, 50);

  root.JobmaniaDeliveryPatterns = {
    load,
    install,
    describe,
    resolveStatus,
    normalizeLocale,
    get data() { return data; }
  };

  load();
})(typeof globalThis !== 'undefined' ? globalThis : window);
