/**
 * Jobmania Skill Unit Engine
 * Root engine for abilities_description.json and passives_description.json.
 *
 * Design goals:
 * - One SkillUnit = one description line.
 * - One Ability/Passive card can contain any number of lines.
 * - No dependency on existing ability/passive basic-info JSON.
 * - Unknown / hardcoded game mechanics are returned as unresolved, never guessed.
 * - Rules are easy to refine later with registerRule().
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.JobmaniaSkillUnit = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const abilityRules = new Map();
  const passiveRules = new Map();

  const ELEMENTS = new Set(["Fire", "Water", "Thunder", "Earth", "Wind", "Light", "Dark"]);

  const statLabel = {
    Strength: "Str",
    Agility: "Agi",
    Intelligence: "Int",
    MaxHP: "MaxHP",
    Protect: "Protect"
  };

  function key(skillUnit, effect) {
    return `${skillUnit}::${effect}`;
  }

  function replaceX(template, value) {
    const numericValue = Number(value);

    // Source Skill Unit descriptions use both:
    //   X     -> multiplier
    //   5X    -> 5 * multiplier
    //   10X   -> 10 * multiplier
    //   0.5X  -> 0.5 * multiplier
    // Preserve simple X substitution when the multiplier is not numeric.
    return String(template).replace(/(?:(\d+(?:\.\d+)?)\s*)?X/g, (match, coefficient) => {
      if (!Number.isFinite(numericValue)) return String(value);
      const factor = coefficient == null ? 1 : Number(coefficient);
      const result = factor * numericValue;
      return Number.isInteger(result) ? String(result) : String(Number(result.toFixed(6)));
    });
  }

  function addRule(kind, skillUnit, effect, rule) {
    const target = kind === "passive" ? passiveRules : abilityRules;
    target.set(key(skillUnit, effect), rule);
  }

  function registerRule(kind, skillUnit, effect, rule) {
    if (!["ability", "passive"].includes(kind)) {
      throw new Error(`Unknown rule kind: ${kind}`);
    }
    addRule(kind, skillUnit, effect, rule);
  }

  function templateRule(template) {
    return ({ Multiplier }) => replaceX(template, Multiplier);
  }

  // Ability / Switch Skill rules
  addRule("ability", "Damage", "Null", templateRule("Deal X damage to the enemy."));
  addRule("ability", "Heal", "Null", templateRule("Recover X HP."));

  ["Strength", "Agility", "Intelligence", "MaxHP", "Protect"].forEach((effect) => {
    const stat = statLabel[effect];
    addRule("ability", "Damage", effect, templateRule(`Deal X% damage based on ${stat} to the enemy.`));
    addRule("ability", "Heal", effect, templateRule(`Recover X% HP based on ${stat}.`));
  });

  ELEMENTS.forEach((effect) => {
    addRule(
      "ability",
      "Damage",
      effect,
      templateRule(`Consume all ${effect} elements, deal X% elemental damage based on the strongest attributes to the opponent for each stack (Trigger Finale on max stacks).`)
    );
    addRule(
      "ability",
      "Heal",
      effect,
      templateRule(`Consume all ${effect} elements, elemental heal X% based on the strongest stat for each stack (Apply Element Enchant on max stacks).`)
    );
  });

  addRule("ability", "Damage", "Element", templateRule("Consume all element buffs, deal X% elemental damage based on the strongest attributes to the opponent for each stack (Trigger Finale on max stacks)."));
  addRule("ability", "Heal", "Element", templateRule("Consume all elements, elemental heal X% based on the strongest stat for each stack (Apply Element Enchant on max stacks)."));
  addRule("ability", "Damage", "Venom", () => "Remove all Venom buffs from the opponent; for each stack, deal 16% damage based on the opponent's Str.");
  addRule("ability", "Damage", "Restrain", () => "Remove all Restrain buffs from the opponent; for each stack, deal 16% damage based on the opponent's Agi.");
  addRule("ability", "Damage", "Insane", () => "Remove all Insane buffs from the opponent; for each stack, deal 16% damage based on the opponent's Int.");
  addRule("ability", "Damage", "Bleed", () => "Remove all Bleed and Bleed Vulnerable stacks from the opponent; for each stack removed, the enemy suffers 1% damage based on MaxHP.");

  ["Strength", "Agility", "Intelligence", "MaxHP"].forEach((effect) => {
    const stat = statLabel[effect];
    addRule("ability", "InstantBoost", effect, templateRule(`Gain X ${stat} Action Buff.`));
    addRule("ability", "Buff", effect, templateRule(`Gain X ${stat} Buff.`));
    addRule("ability", "Debuff", effect, templateRule(`Apply X ${stat} Debuff on the opponent.`));
    addRule("ability", "Vulnerable", effect, templateRule(`Inflict X ${stat} Vulnerable on the opponent.`));
  });

  addRule("ability", "InstantBoost", "Protect", templateRule("Gain X Protect Boost."));
  addRule("ability", "InstantBoost", "Action", templateRule("Gain X Action Points."));
  addRule("ability", "InstantBoost", "Draw", templateRule("Draw X abilities."));
  addRule("ability", "InstantBoost", "Charge", () => "Apply a Charge buff on self.");
  addRule("ability", "InstantBoost", "Guard", () => "Apply a Guard buff on self.");
  addRule("ability", "InstantBoost", "Multiply", () => "Double self stat Action Buffs.");
  addRule("ability", "InstantBoost", "Certain", templateRule("Apply X Certain on self."));
  addRule("ability", "InstantBoost", "Dice", templateRule("Gain X Gamble Token."));
  addRule("ability", "InstantBoost", "Direct", templateRule("Skip X turn, triggering player and enemy turn-start and turn-end passives X times."));

  addRule("ability", "Buff", "Action", templateRule("Gain X Action Points at the start of next turn."));
  addRule("ability", "Buff", "Draw", templateRule("Draw X abilities at the start of next turn."));
  addRule("ability", "Buff", "Charge", () => "Apply a stack Charge buff on self.");
  addRule("ability", "Buff", "Guard", () => "Apply a stack Guard buff on self.");
  addRule("ability", "Buff", "Multiply", () => "Double self Stat Buffs.");
  addRule("ability", "Buff", "Element", templateRule("Add X to the existing element; if no element is active, add a random element."));
  addRule("ability", "Buff", "Dice", templateRule("Gain X random buff."));
  addRule("ability", "Buff", "Reflect", () => "Gain Vengeance Buff.");

  ELEMENTS.forEach((effect) => addRule("ability", "Buff", effect, templateRule(`Add X ${effect} element to self.`)));

  const statusDebuffs = {
    Fire: "Burn",
    Water: "Chill",
    Thunder: "Paralysis",
    Earth: "Seed",
    Wind: "Dizzy",
    Light: "Blind",
    Dark: "Depress",
    Bleed: "Bleed",
    Injury: "Injury",
    Venom: "Venom",
    Restrain: "Restrain",
    Insane: "Insane",
    Confuse: "Confuse",
    Slack: "Slack",
    Aggro: "Taunt",
    Misfortune: "Bad Mood",
    Reverse: "Reflux",
    Trance: "Trance"
  };

  Object.entries(statusDebuffs).forEach(([effect, label]) => addRule("ability", "Debuff", effect, templateRule(`Inflict X ${label} on the opponent.`)));
  addRule("ability", "Debuff", "Element", templateRule("Inflict X random elemental status effect on the opponent."));
  addRule("ability", "Debuff", "Multiply", () => "Double the opponent's stat Debuffs.");
  addRule("ability", "Debuff", "VRI", templateRule("Apply X random VRI to the opponent."));
  addRule("ability", "Debuff", "Dice", templateRule("Inflict X random debuff on the opponent."));

  addRule("ability", "Protect", "Null", templateRule("Add Protect that absorbs X damage."));
  ["Strength", "Agility", "Intelligence", "MaxHP"].forEach((effect) => addRule("ability", "Protect", effect, templateRule(`Add X% Protect based on ${statLabel[effect]}.`)));
  addRule("ability", "Protect", "Guard", templateRule("Gain X Second Chance buff."));
  addRule("ability", "Protect", "Draw", () => "Recover one skill from the discard pile.");
  addRule("ability", "Protect", "Debuff", () => "Remove stat Debuffs and Vulnerables from self.");
  addRule("ability", "Protect", "Direct", () => "Gain an Invulnerable buff.");
  addRule("ability", "Protect", "Sacrifice", () => "Gain a Substitute Buff.");
  addRule("ability", "Protect", "Element", templateRule("Remove elemental status effects from self (0 = Common, 1 = Special, 2 = All)."));

  const removeStatus = {
    Fire: "Burn", Water: "Chill", Thunder: "Paralysis", Earth: "Seed",
    Wind: "Dizzy", Light: "Blind", Dark: "Depress", Bleed: "Bleed",
    Injury: "Injury", Venom: "Venom", Restrain: "Restrain", Insane: "Insane"
  };
  Object.entries(removeStatus).forEach(([effect, label]) => addRule("ability", "Protect", effect, () => `Remove ${label} from self.`));

  ["Strength", "Agility", "Intelligence", "MaxHP", "Protect"].forEach((effect) => addRule("ability", "Mark", effect, templateRule(`Inflict X ${statLabel[effect]} Sigil on the opponent.`)));
  ELEMENTS.forEach((effect) => addRule("ability", "Mark", effect, templateRule(`Inflict X ${effect} Sigil on the opponent.`)));

  addRule("ability", "Vulnerable", "Protect", templateRule("Inflict X Protect Pierce on the opponent."));
  ELEMENTS.forEach((effect) => addRule("ability", "Vulnerable", effect, templateRule(`Inflict X ${effect} Vulnerable on the opponent.`)));
  addRule("ability", "Vulnerable", "Bleed", templateRule("Apply X Bleed Vulnerable on the opponent."));
  addRule("ability", "Vulnerable", "Injury", templateRule("Apply X Injury Vulnerable on the opponent."));
  addRule("ability", "Vulnerable", "Multiply", () => "Double the opponent's Vulnerable Debuffs.");
  addRule("ability", "Vulnerable", "Venom", templateRule("Inflict X Corruption on the opponent."));
  addRule("ability", "Vulnerable", "Restrain", templateRule("Inflict X Seal on the opponent."));
  addRule("ability", "Vulnerable", "Insane", templateRule("Inflict X Madness on the opponent."));
  addRule("ability", "Vulnerable", "Debuff", templateRule("Inflict X Immunocompromised."));

  addRule("ability", "Sacrifice", "MaxHP", templateRule("Lose 10X% of Max HP."));
  addRule("ability", "Sacrifice", "Draw", () => "Discard 1 skill from hand.");
  addRule("ability", "Sacrifice", "Null", () => "Deal 99999 damage to self.");
  addRule("ability", "Sacrifice", "Multiply", () => "Apply an Afterimage buff on self.");
  addRule("ability", "Sacrifice", "Charge", templateRule("Apply X Rage on self."));
  addRule("ability", "Sacrifice", "Guard", templateRule("Apply X Instinct on self."));
  Object.entries(statusDebuffs).forEach(([effect, label]) => addRule("ability", "Sacrifice", effect, templateRule(`Gain X ${label} on self.`)));
  addRule("ability", "Sacrifice", "Element", templateRule("Gain X random elemental status effect on self."));
  addRule("ability", "Sacrifice", "VRI", templateRule("Apply X random VRI on self."));
  addRule("ability", "Sacrifice", "Dice", templateRule("Inflict X random debuff on self."));

  ["Strength", "Agility", "Intelligence", "MaxHP"].forEach((effect) => addRule("ability", "InstantNerf", effect, templateRule(`Gain X ${statLabel[effect]} Action Debuff.`)));
  ["Strength", "Agility", "Intelligence", "MaxHP"].forEach((effect) => {
    addRule("ability", "Discard", effect, templateRule(`For each ${statLabel[effect]} ability in the discard pile, deal combined X damage (max 20x).`));
    addRule("ability", "Unique", effect, templateRule(`For each unique ${statLabel[effect]} ability in the deck, deal combined X damage (max 20x).`));
  });
  ELEMENTS.forEach((effect) => {
    addRule("ability", "Discard", effect, templateRule(`For each ${effect} ability in the discard pile, deal combined X damage (max 20x).`));
    addRule("ability", "Unique", effect, templateRule(`For each unique ${effect} ability in the deck, deal combined X damage (max 20x).`));
  });
  addRule("ability", "Discard", "Draw", templateRule("Randomly discard X abilities from hand."));
  addRule("ability", "Discard", "Buff", templateRule("Remove X random buffs from the opponent."));
  addRule("ability", "Discard", "Element", () => "Remove all elemental stacks from both parties; for every 2 stacks removed, apply a random elemental status effect to the target.");
  addRule("ability", "Null", "Null", () => "Do nothing.");
  addRule("ability", "Null", "Dice", () => "Use a random ability.");
  addRule("ability", "Null", "Reverse", () => "Use a random ability from the draw or discard pile.");

  // Passive rules
  ["Strength", "Agility", "Intelligence", "MaxHP", "Protect"].forEach((effect) => {
    const stat = statLabel[effect];
    addRule("passive", "TurnDamage", effect, templateRule(`Deal X% ${stat} damage to the enemy at the end of turn.`));
    addRule("passive", "ActionDamage", effect, templateRule(`Deal X% ${stat} damage to the enemy after every action.`));
    addRule("passive", "TurnHeal", effect, templateRule(`Recover X% ${stat} health at the end of turn.`));
    addRule("passive", "ActionHeal", effect, templateRule(`Recover X% ${stat} health after every action.`));
  });

  ["Strength", "Agility", "Intelligence", "MaxHP"].forEach((effect) => {
    const stat = statLabel[effect];
    addRule("passive", "InstantBoost", effect, templateRule(`Gain X ${stat} Buff at the start of combat.`));
    addRule("passive", "Buff", effect, templateRule(`Boost ${stat} by 10X%.`));
    addRule("passive", "Debuff", effect, templateRule(`Reduce ${stat} by 10X%.`));
    addRule("passive", "Protect", effect, templateRule(`Start combat with X% ${stat} Protect.`));
    addRule("passive", "Reflect", effect, templateRule(`When attacked, reflect X% ${stat} damage to the enemy.`));
    addRule("passive", "ActionBuff", effect, templateRule(`Gain X ${stat} Action Buff after every action.`));
    addRule("passive", "TurnBuff", effect, templateRule(`Gain X ${stat} Action Buff at the end of turn.`));
  });

  addRule("passive", "Buff", "Protect", templateRule("Reduce damage received by 10X% while the job is active."));
  addRule("passive", "Buff", "Action", templateRule("Add X to default Action."));
  addRule("passive", "Buff", "Draw", templateRule("Add X to default Draw."));
  addRule("passive", "Debuff", "Action", templateRule("Reduce default Action by X."));
  addRule("passive", "Debuff", "Draw", templateRule("Reduce default Draw by X."));

  ELEMENTS.forEach((effect) => {
    addRule("passive", "InstantBoost", effect, templateRule(`Start combat with X ${effect} element.`));
    addRule("passive", "Protect", effect, () => `Immune to ${statusDebuffs[effect] || effect}.`);
    addRule("passive", "Reflect", effect, () => `Reflect ${statusDebuffs[effect] || effect} effects back to the enemy.`);
    addRule("passive", "TurnDebuff", effect, templateRule(`Inflict X ${statusDebuffs[effect] || effect} on the opponent at the end of turn.`));
    addRule("passive", "ActionBuff", effect, templateRule(`Gain X ${effect} Action Buff after every action.`));
    addRule("passive", "Combo", effect, templateRule(`Give X ${effect} Action Buff whenever ${effect} Combo triggers.`));
    addRule("passive", "Buff", effect, templateRule(`Buff ${effect} damage and healing by 5X%.`));
  });

  addRule("passive", "InstantBoost", "Element", templateRule("Start combat with X Pure element."));
  addRule("passive", "InstantBoost", "Charge", templateRule("Start combat with Charge/Stack Charge according to multiplier X."));
  addRule("passive", "InstantBoost", "Guard", templateRule("Start combat with Guard/Stack Guard according to multiplier X."));
  addRule("passive", "InstantBoost", "Certain", templateRule("Gain X Certain at the start of combat."));
  addRule("passive", "Protect", "Guard", templateRule("Gain X Second Chance at the start of combat."));
  addRule("passive", "Protect", "Element", templateRule("Immune to elemental status effects (multiplier X controls scope)."));
  addRule("passive", "Protect", "Debuff", () => "Immune to stat Debuffs.");
  addRule("passive", "Protect", "Direct", templateRule("Gain Invulnerable according to multiplier X."));
  addRule("passive", "Protect", "Delay", () => "Half damage-over-time effects received.");
  addRule("passive", "Protect", "LifeSteal", templateRule("When attacked, gain Protect equal to 10X% of damage received."));
  ["Bleed", "Injury", "Venom", "Restrain", "Insane"].forEach((effect) => addRule("passive", "Protect", effect, () => `Immune to ${effect}.`));

  addRule("passive", "Reflect", "Protect", () => "When attacked, reflect the Protect removed back as damage.");
  addRule("passive", "Reflect", "Element", () => "Reflect elemental status effects back to the enemy.");
  addRule("passive", "Reflect", "Bleed", templateRule("Enemy gains X Bleed for damaging you."));
  addRule("passive", "Reflect", "Injury", templateRule("Enemy gains X Injury for damaging you."));
  addRule("passive", "Reflect", "Venom", templateRule("Enemy gains X Venom for damaging you."));
  addRule("passive", "Reflect", "Restrain", templateRule("Enemy gains X Restrain for damaging you."));
  addRule("passive", "Reflect", "Insane", templateRule("Enemy gains X Insane for damaging you."));

  addRule("passive", "Sacrifice", "Charge", templateRule("For every damage dealt, gain Rage; its damage bonus scales with X."));
  addRule("passive", "Sacrifice", "Guard", templateRule("For every direct damage received, gain Instinct; its reduction scales with X."));
  addRule("passive", "Heal", "Guard", templateRule("Convert 25% of excess Heal into Protect per stack X."));
  addRule("passive", "Heal", "Charge", templateRule("Convert 25% of excess Heal into damage per stack X."));
  addRule("passive", "Heal", "Direct", () => "Once per battle, resurrect after fatal damage and restore health to full.");

  ["Fire", "Water", "Thunder", "Earth", "Wind", "Light", "Dark", "Bleed", "Injury", "Venom", "Restrain", "Insane", "Confuse", "Slack"].forEach((effect) => addRule("passive", "InstantNerf", effect, templateRule(`Gain X ${statusDebuffs[effect] || effect} at the start of combat.`)));
  ["Strength", "Agility", "Intelligence", "MaxHP"].forEach((effect) => addRule("passive", "InstantNerf", effect, templateRule(`Start combat with X ${statLabel[effect]} Debuff.`)));

  addRule("passive", "TurnDebuff", "Bleed", templateRule("Inflict X Bleed on the opponent at the end of turn."));
  addRule("passive", "TurnDebuff", "Injury", templateRule("Inflict X Injury on the opponent at the end of turn."));
  addRule("passive", "TurnDebuff", "Confuse", templateRule("Inflict X Confuse on the opponent at the end of turn."));
  addRule("passive", "TurnDebuff", "Slack", templateRule("Inflict X Slack on the opponent at the end of turn."));
  ["Strength", "Agility", "Intelligence", "MaxHP"].forEach((effect) => addRule("passive", "TurnDebuff", effect, templateRule(`Inflict X ${statLabel[effect]} Debuff on the opponent at the end of turn.`)));

  addRule("passive", "ActionDebuff", "Venom", templateRule("Apply X Venom to the enemy after every action."));
  addRule("passive", "ActionDebuff", "Restrain", templateRule("Apply X Restrain to the enemy after every action."));
  addRule("passive", "ActionDebuff", "Insane", templateRule("Apply X Insane to the enemy after every action."));
  addRule("passive", "ActionDebuff", "Protect", templateRule("Inflict X Protect Pierce after every action."));
  addRule("passive", "ActionBuff", "Protect", templateRule("Gain X Protect Enhance after every action."));
  addRule("passive", "TurnBuff", "Dice", templateRule("Gain X Gamble Token at the end of turn."));
  addRule("passive", "TurnBuff", "Multiply", templateRule("Gain X Afterimage at the end of turn."));

  addRule("passive", "Drain", "Venom", () => "On receiving Venom, heal based on Str and gain Str Instant Boost per stack.");
  addRule("passive", "Drain", "Restrain", () => "On receiving Restrain, heal based on Agi and gain Agi Instant Boost per stack.");
  addRule("passive", "Drain", "Insane", () => "On receiving Insane, heal based on Int and gain Int Instant Boost per stack.");
  addRule("passive", "Drain", "Bleed", () => "When the enemy suffers Bleed damage, heal for half of that damage.");

  addRule("passive", "Upgrade", "Null", () => "Increase raw damage, healing and Protect values based on level.");
  addRule("passive", "Upgrade", "Reflect", () => "Allow reflecting while Protect is active; Protect Reflect deals double damage.");
  addRule("passive", "Upgrade", "Summon", () => "Trigger special effects when using abilities with the Summon tag.");
  addRule("passive", "Upgrade", "Direct", () => "If the user has only one Job, increase max stats and repeatedly execute the main Job ability.");
  addRule("passive", "Upgrade", "Dice", () => "Reroll low dice results and reduce the effectiveness of certain status effects.");
  addRule("passive", "Upgrade", "Exhaust", () => "Gain a random Action Buff/Gamble Token when abilities are exhausted or effect-discarded.");

  ["Strength", "Agility", "Intelligence", "MaxHP", "Protect", "Debuff", "Combo", "Multiply", "Charge", "Guard", "LifeSteal", "Humanoid", "Spirit", "Creature", "Matter", "Element", "Fire", "Water", "Thunder", "Earth", "Wind", "Light", "Dark", "Bleed", "Injury", "Curse"].forEach((effect) => {
    if (!passiveRules.has(key("Upgrade", effect))) {
      addRule("passive", "Upgrade", effect, ({ Multiplier }) => ({
        text: null,
        unresolved: true,
        reason: `Upgrade::${effect} is recognised but requires exact game-rule refinement`,
        multiplier: Multiplier
      }));
    }
  });

  function normaliseUnit(unit) {
    return {
      SkillUnit: unit?.SkillUnit ?? "",
      Effect: unit?.Effect ?? "",
      Multiplier: unit?.Multiplier ?? 0
    };
  }

  function resolveUnit(unit, options = {}) {
    const kind = options.kind === "passive" ? "passive" : "ability";
    const normal = normaliseUnit(unit);
    const rules = kind === "passive" ? passiveRules : abilityRules;
    const rule = rules.get(key(normal.SkillUnit, normal.Effect));

    if (!rule) {
      return {
        ...normal,
        text: null,
        resolved: false,
        reason: `No ${kind} rule for ${normal.SkillUnit} + ${normal.Effect}`
      };
    }

    let result;
    try {
      result = typeof rule === "function" ? rule(normal, options) : rule;
    } catch (error) {
      return {
        ...normal,
        text: null,
        resolved: false,
        reason: error?.message || String(error)
      };
    }

    if (result && typeof result === "object" && result.unresolved) {
      return {
        ...normal,
        text: null,
        resolved: false,
        reason: result.reason || "Rule requires refinement"
      };
    }

    const text = typeof result === "string" ? result : result?.text;
    if (!text) {
      return {
        ...normal,
        text: null,
        resolved: false,
        reason: "Rule produced no description"
      };
    }

    return {
      ...normal,
      text,
      resolved: true
    };
  }

  function resolveEntry(entry, options = {}) {
    const inferredKind = entry?.PassiveKey ? "passive" : "ability";
    const kind = options.kind || inferredKind;
    const entryKey = kind === "passive" ? entry?.PassiveKey : entry?.AbilityKey;
    const units = Array.isArray(entry?.SkillUnits) ? entry.SkillUnits : [];
    const results = units.map((unit) => resolveUnit(unit, { ...options, kind }));

    return {
      key: entryKey || "",
      kind,
      descriptions: results.filter((r) => r.resolved).map((r) => r.text),
      unresolved: results.filter((r) => !r.resolved),
      units: results
    };
  }

  function resolveLibrary(entries, options = {}) {
    return (Array.isArray(entries) ? entries : []).map((entry) => resolveEntry(entry, options));
  }

  return {
    resolveUnit,
    resolveEntry,
    resolveLibrary,
    registerRule,
    abilityRules,
    passiveRules
  };
});
