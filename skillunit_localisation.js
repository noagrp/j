/**
 * Jobmania Skill Unit Localisation Engine
 *
 * This file does not contain Ability/Passive names or basic info.
 * It only formats Skill Unit description templates for the requested locale.
 *
 * The localisation dictionary should use the existing "Skills Description" shape:
 * {
 *   "SomeTemplateKey": {
 *     "English": "... {0} ...",
 *     "Chinese": "... {0} ...",
 *     ...
 *   }
 * }
 *
 * Exact template-key mapping will be expanded during Wiki testing.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.JobmaniaSkillUnitLocalisation = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const DEFAULT_LANGUAGE = "English";

  function formatTemplate(template, args = []) {
    if (template == null) return null;
    return String(template).replace(/\{(\d+)\}/g, (match, index) => {
      const value = args[Number(index)];
      return value == null ? match : String(value);
    });
  }

  function getLocalizedValue(dictionary, key, language = DEFAULT_LANGUAGE) {
    if (!dictionary || !key) return null;
    const row = dictionary[key];
    if (!row) return null;

    if (typeof row === "string") {
      return language === DEFAULT_LANGUAGE ? row : null;
    }

    return row[language] ?? row[DEFAULT_LANGUAGE] ?? null;
  }

  function localizeTerm(dictionary, termKey, language = DEFAULT_LANGUAGE) {
    return getLocalizedValue(dictionary, termKey, language) ?? termKey;
  }

  function renderTemplate(dictionary, templateKey, args = [], language = DEFAULT_LANGUAGE) {
    const template = getLocalizedValue(dictionary, templateKey, language);
    if (!template) return null;
    return formatTemplate(template, args);
  }

  /**
   * Localise a resolved Skill Unit line.
   *
   * Preferred future shape from skillunit.js:
   * {
   *   templateKey: "DealXDamageJoin",
   *   args: ["..."]
   * }
   *
   * Current fallback:
   * {
   *   text: "English generated text"
   * }
   *
   * The fallback is intentionally English-only until the exact localisation
   * template mapping is verified.
   */
  function localizeResolvedUnit(resolvedUnit, dictionary, language = DEFAULT_LANGUAGE) {
    if (!resolvedUnit) return null;

    if (resolvedUnit.templateKey) {
      const args = Array.isArray(resolvedUnit.args) ? resolvedUnit.args : [];
      return renderTemplate(dictionary, resolvedUnit.templateKey, args, language);
    }

    if (language === DEFAULT_LANGUAGE && resolvedUnit.text) {
      return resolvedUnit.text;
    }

    return null;
  }

  /**
   * Produces Wiki-ready description lines.
   * One card header, N paragraph/line entries.
   */
  function localizeEntry(resolvedEntry, dictionary, language = DEFAULT_LANGUAGE) {
    const units = Array.isArray(resolvedEntry?.units) ? resolvedEntry.units : [];
    const lines = units
      .map((unit) => localizeResolvedUnit(unit, dictionary, language))
      .filter(Boolean);

    return {
      key: resolvedEntry?.key || "",
      language,
      descriptions: lines
    };
  }

  function indexLocalisationRows(rows) {
    const result = Object.create(null);
    for (const row of Array.isArray(rows) ? rows : []) {
      if (!row || !row.Key) continue;
      const { Key, ...languages } = row;
      result[Key] = languages;
    }
    return result;
  }

  return {
    DEFAULT_LANGUAGE,
    formatTemplate,
    getLocalizedValue,
    localizeTerm,
    renderTemplate,
    localizeResolvedUnit,
    localizeEntry,
    indexLocalisationRows
  };
});
