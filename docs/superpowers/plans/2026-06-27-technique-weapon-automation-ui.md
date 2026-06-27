# Technique Weapon Automation UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a user-facing Technique Sheet editor for the existing `system.flags.dictionary.weaponAttack.*` automation.

**Architecture:** Keep runtime behavior in `scripts/features/techniques/weapon-attack.mjs`. Add a small sheet-facing helper module that converts dotted dictionary flags to form state, normalizes form state back to dotted flags, applies quick presets, and builds compact action-list summaries. The Technique Sheet consumes that helper in `getData()` and `_updateObject()`, while Handlebars/CSS/localization render the editor in the existing `Automation` tab.

**Tech Stack:** Foundry VTT v13, PF1e v11.11+, JavaScript ESM, Handlebars templates, CSS, Node `node:test`, existing `npm test`, `npm run lint:format`, `npm run lint:js`, and `npm run lint:css`.

---

## Scope Check

The spec covers one subsystem: making existing `weaponAttack` technique automation configurable in the Technique Sheet. It does not require new runtime attack behavior, PF1e action-sheet customization, or compendium JSON migration.

## File Structure

- Create `scripts/features/techniques/weapon-attack-sheet.mjs`
  - Owns sheet-only constants, preset application, extra-attack text normalization, dictionary update building, and summary labels.
  - Depends on `readWeaponAttackRaw()` and `parseWeaponAttackConfig()` from `weapon-attack.mjs`.
- Create `tests/weapon-attack-sheet.test.mjs`
  - Tests helper behavior without Foundry runtime.
- Modify `scripts/features/techniques/sheet.mjs`
  - Imports helper functions.
  - Adds `context.weaponAttack` and `context.weaponAttackSummary`.
  - Converts submitted form fields into `system.flags.dictionary.weaponAttack.*`.
- Modify `templates/item/technique-sheet.hbs`
  - Shows a compact summary badge in the `Details` action list when enabled.
  - Adds the `Weapon Attack Automation` section to the `Automation` tab.
- Modify `styles/item/technique-sheet.css`
  - Adds layout rules for the new grouped form area and summary badge.
- Modify `lang/en.json` and `lang/pt-BR.json`
  - Adds labels, hints, choices, and summary strings.
- Local cleanup decision after implementation: when `.superpowers/` remains untracked, either delete the directory after the companion is no longer needed or add `.superpowers/` to `.gitignore` in a separate cleanup commit.

---

### Task 1: Add Sheet Helper Tests

**Files:**
- Create: `tests/weapon-attack-sheet.test.mjs`
- Later Modify: `scripts/features/techniques/weapon-attack-sheet.mjs`

- [ ] **Step 1: Write the failing helper tests**

Create `tests/weapon-attack-sheet.test.mjs` with this complete content:

```js
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  applyWeaponAttackPreset,
  buildWeaponAttackDictionaryUpdates,
  buildWeaponAttackFormData,
  buildWeaponAttackSummary,
  normalizeExtraAttacksText,
} from "../scripts/features/techniques/weapon-attack-sheet.mjs";

function itemWithDictionary(dictionary) {
  return {
    system: {
      flags: { dictionary },
    },
  };
}

describe("weapon attack sheet form data", () => {
  it("reads existing dotted dictionary flags into editable form state", () => {
    const item = itemWithDictionary({
      "weaponAttack.mode": "selected",
      "weaponAttack.filter": "unarmedOnly",
      "weaponAttack.damageMode": "replace",
      "weaponAttack.attackBonus": "-5",
      "weaponAttack.extraAttacks": "0|Second Attack;0|Third Attack",
      "weaponAttack.iteratives": "false",
      "weaponAttack.suppressedBonuses": "naturalAttack,abilityDamage",
      unrelated: "kept",
    });

    const data = buildWeaponAttackFormData(item);

    assert.equal(data.enabled, true);
    assert.equal(data.filter, "unarmedOnly");
    assert.equal(data.damageMode, "replace");
    assert.equal(data.attackBonus, "-5");
    assert.equal(data.extraAttacksText, "0|Second Attack\n0|Third Attack");
    assert.equal(data.iteratives, false);
    assert.equal(data.suppressNaturalAttack, true);
    assert.equal(data.suppressAbilityDamage, true);
    assert.deepEqual(data.warnings, []);
  });

  it("returns disabled defaults when no weaponAttack config is present", () => {
    const data = buildWeaponAttackFormData(itemWithDictionary({ unrelated: "kept" }));

    assert.equal(data.enabled, false);
    assert.equal(data.filter, "meleeWeapon");
    assert.equal(data.damageMode, "add");
    assert.equal(data.charge, false);
    assert.equal(data.iteratives, true);
    assert.equal(data.extraAttacksText, "");
  });
});

describe("weapon attack sheet presets", () => {
  it("applies a Raite-like preset", () => {
    const next = applyWeaponAttackPreset("raite", {
      enabled: false,
      filter: "meleeWeapon",
      damageMode: "add",
    });

    assert.equal(next.enabled, true);
    assert.equal(next.filter, "unarmedOnly");
    assert.equal(next.damageMode, "replace");
    assert.equal(next.charge, false);
    assert.equal(next.iteratives, true);
  });

  it("applies a Ryuutsuki-like preset", () => {
    const next = applyWeaponAttackPreset("ryuutsuki", {
      enabled: false,
      filter: "unarmedOnly",
      damageMode: "replace",
    });

    assert.equal(next.enabled, true);
    assert.equal(next.filter, "meleeOrUnarmed");
    assert.equal(next.damageMode, "add");
    assert.equal(next.charge, true);
  });

  it("keeps current fields for custom preset", () => {
    const current = {
      enabled: true,
      filter: "rangedWeapon",
      damageMode: "add",
      attackBonus: "1[Test]",
    };

    assert.deepEqual(applyWeaponAttackPreset("custom", current), current);
  });
});

describe("weapon attack sheet normalization", () => {
  it("normalizes newline and semicolon extra attacks into dictionary format", () => {
    assert.equal(
      normalizeExtraAttacksText("0|Second Attack\n0|Third Attack; -5|Fourth Attack"),
      "0|Second Attack;0|Third Attack;-5|Fourth Attack",
    );
  });

  it("builds dictionary updates for enabled automation and removes empty optional keys", () => {
    const updates = buildWeaponAttackDictionaryUpdates(
      {
        enabled: true,
        filter: "unarmedOnly",
        damageMode: "replace",
        attackBonus: "-5",
        damageBonus: "",
        nonCritDamageBonus: "",
        held: "",
        charge: false,
        iteratives: false,
        extraAttacksText: "0|Second Attack\n0|Third Attack",
        suppressNaturalAttack: false,
        suppressAbilityDamage: true,
      },
      {
        "weaponAttack.damageBonus": "old",
        "weaponAttack.charge": "true",
        unrelated: "kept",
      },
    );

    assert.deepEqual(updates, {
      "system.flags.dictionary.weaponAttack.mode": "selected",
      "system.flags.dictionary.weaponAttack.filter": "unarmedOnly",
      "system.flags.dictionary.weaponAttack.damageMode": "replace",
      "system.flags.dictionary.weaponAttack.attackBonus": "-5",
      "system.flags.dictionary.-=weaponAttack.damageBonus": null,
      "system.flags.dictionary.-=weaponAttack.charge": null,
      "system.flags.dictionary.weaponAttack.iteratives": "false",
      "system.flags.dictionary.weaponAttack.extraAttacks": "0|Second Attack;0|Third Attack",
      "system.flags.dictionary.weaponAttack.suppressedBonuses": "abilityDamage",
    });
  });

  it("removes all known weaponAttack keys when automation is disabled", () => {
    const updates = buildWeaponAttackDictionaryUpdates(
      { enabled: false },
      {
        "weaponAttack.mode": "selected",
        "weaponAttack.filter": "unarmedOnly",
        "weaponAttack.damageMode": "replace",
        unrelated: "kept",
      },
    );

    assert.deepEqual(updates, {
      "system.flags.dictionary.-=weaponAttack.mode": null,
      "system.flags.dictionary.-=weaponAttack.filter": null,
      "system.flags.dictionary.-=weaponAttack.damageMode": null,
      "system.flags.dictionary.-=weaponAttack.attackBonus": null,
      "system.flags.dictionary.-=weaponAttack.damageBonus": null,
      "system.flags.dictionary.-=weaponAttack.nonCritDamageBonus": null,
      "system.flags.dictionary.-=weaponAttack.extraAttacks": null,
      "system.flags.dictionary.-=weaponAttack.held": null,
      "system.flags.dictionary.-=weaponAttack.charge": null,
      "system.flags.dictionary.-=weaponAttack.iteratives": null,
      "system.flags.dictionary.-=weaponAttack.suppressedBonuses": null,
    });
  });
});

describe("weapon attack sheet summary", () => {
  it("builds a compact Juuroku Rendan style summary", () => {
    const summary = buildWeaponAttackSummary({
      enabled: true,
      filter: "unarmedOnly",
      damageMode: "replace",
      extraAttacksText: "0|Second Attack\n0|Third Attack",
      iteratives: false,
      charge: false,
    });

    assert.deepEqual(summary, {
      enabled: true,
      parts: ["Selected Unarmed", "Replace damage", "3 attacks", "no iteratives"],
      label: "Selected Unarmed · Replace damage · 3 attacks · no iteratives",
    });
  });

  it("returns a disabled summary for normal techniques", () => {
    assert.deepEqual(buildWeaponAttackSummary({ enabled: false }), {
      enabled: false,
      parts: [],
      label: "",
    });
  });
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run:

```bash
node --test tests/weapon-attack-sheet.test.mjs
```

Expected:

```text
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '.../scripts/features/techniques/weapon-attack-sheet.mjs'
```

- [ ] **Step 3: Commit is not needed for a failing test-only checkpoint**

Do not commit the failing test by itself. Continue to Task 2, then commit the passing helper and test together.

---

### Task 2: Implement Sheet Helper Module

**Files:**
- Create: `scripts/features/techniques/weapon-attack-sheet.mjs`
- Test: `tests/weapon-attack-sheet.test.mjs`

- [ ] **Step 1: Create the helper module**

Create `scripts/features/techniques/weapon-attack-sheet.mjs` with this complete content:

```js
import { parseWeaponAttackConfig, readWeaponAttackRaw } from "./weapon-attack.mjs";

export const WEAPON_ATTACK_FIELD_KEYS = [
  "mode",
  "filter",
  "damageMode",
  "attackBonus",
  "damageBonus",
  "nonCritDamageBonus",
  "extraAttacks",
  "held",
  "charge",
  "iteratives",
  "suppressedBonuses",
];

export const WEAPON_ATTACK_FILTER_CHOICES = {
  meleeWeapon: "NarutoD20.WeaponAttack.Filter.MeleeWeapon",
  rangedWeapon: "NarutoD20.WeaponAttack.Filter.RangedWeapon",
  unarmedOnly: "NarutoD20.WeaponAttack.Filter.UnarmedOnly",
  meleeOrUnarmed: "NarutoD20.WeaponAttack.Filter.MeleeOrUnarmed",
};

export const WEAPON_ATTACK_DAMAGE_MODE_CHOICES = {
  add: "NarutoD20.WeaponAttack.DamageMode.Add",
  replace: "NarutoD20.WeaponAttack.DamageMode.Replace",
};

export const WEAPON_ATTACK_HELD_CHOICES = {
  "": "NarutoD20.WeaponAttack.Held.Unchanged",
  onehanded: "NarutoD20.WeaponAttack.Held.OneHanded",
  twohanded: "NarutoD20.WeaponAttack.Held.TwoHanded",
};

export const WEAPON_ATTACK_PRESET_CHOICES = {
  custom: "NarutoD20.WeaponAttack.Preset.Custom",
  raite: "NarutoD20.WeaponAttack.Preset.Raite",
  jikiUchi: "NarutoD20.WeaponAttack.Preset.JikiUchi",
  ryuutsuki: "NarutoD20.WeaponAttack.Preset.Ryuutsuki",
  fixedCombo: "NarutoD20.WeaponAttack.Preset.FixedCombo",
};

const DEFAULT_FORM_DATA = Object.freeze({
  enabled: false,
  preset: "custom",
  filter: "meleeWeapon",
  damageMode: "add",
  attackBonus: "",
  damageBonus: "",
  nonCritDamageBonus: "",
  extraAttacksText: "",
  held: "",
  charge: false,
  iteratives: true,
  suppressNaturalAttack: false,
  suppressAbilityDamage: false,
  warnings: [],
});

const SUPPRESSION_TOKENS = Object.freeze({
  naturalAttack: "suppressNaturalAttack",
  abilityDamage: "suppressAbilityDamage",
});

export function buildWeaponAttackFormData(item) {
  const raw = readWeaponAttackRaw(item);
  if (!raw.present) return { ...DEFAULT_FORM_DATA };

  const { config, warnings } = parseWeaponAttackConfig(raw);
  if (!config) return { ...DEFAULT_FORM_DATA, warnings };

  const suppressions = new Set(config.suppressedBonuses ?? []);
  return {
    ...DEFAULT_FORM_DATA,
    enabled: true,
    filter: config.filter,
    damageMode: config.damageMode,
    attackBonus: config.attackBonus,
    damageBonus: config.damageBonus,
    nonCritDamageBonus: config.nonCritDamageBonus,
    extraAttacksText: extraAttacksToText(config.extraAttacks),
    held: config.held,
    charge: config.charge === true,
    iteratives: config.iteratives !== false,
    suppressNaturalAttack: suppressions.has("naturalAttack"),
    suppressAbilityDamage: suppressions.has("abilityDamage"),
    warnings,
  };
}

export function applyWeaponAttackPreset(preset, current) {
  const base = { ...DEFAULT_FORM_DATA, ...current, preset };
  if (preset === "custom") return current;
  if (preset === "raite") {
    return {
      ...base,
      enabled: true,
      filter: "unarmedOnly",
      damageMode: "replace",
      charge: false,
      iteratives: true,
    };
  }
  if (preset === "jikiUchi") {
    return {
      ...base,
      enabled: true,
      filter: "meleeOrUnarmed",
      damageMode: "add",
      charge: false,
      iteratives: true,
    };
  }
  if (preset === "ryuutsuki") {
    return {
      ...base,
      enabled: true,
      filter: "meleeOrUnarmed",
      damageMode: "add",
      charge: true,
      iteratives: true,
    };
  }
  if (preset === "fixedCombo") {
    return {
      ...base,
      enabled: true,
      damageMode: base.damageMode || "replace",
      iteratives: false,
    };
  }
  return current;
}

export function normalizeExtraAttacksText(value) {
  return String(value ?? "")
    .split(/[;\n]/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .join(";");
}

export function buildWeaponAttackDictionaryUpdates(formData, currentDictionary = {}) {
  const updates = {};
  for (const key of WEAPON_ATTACK_FIELD_KEYS) {
    updates[`system.flags.dictionary.-=weaponAttack.${key}`] = null;
  }

  if (formData.enabled !== true) return updates;

  const put = (key, value) => {
    const stringValue = String(value ?? "").trim();
    if (stringValue) {
      updates[`system.flags.dictionary.weaponAttack.${key}`] = stringValue;
      delete updates[`system.flags.dictionary.-=weaponAttack.${key}`];
    }
  };

  put("mode", "selected");
  put("filter", formData.filter || "meleeWeapon");
  put("damageMode", formData.damageMode || "add");
  put("attackBonus", formData.attackBonus);
  put("damageBonus", formData.damageBonus);
  put("nonCritDamageBonus", formData.nonCritDamageBonus);
  put("held", formData.held);

  if (formData.charge === true) put("charge", "true");
  if (formData.iteratives === false) put("iteratives", "false");

  const extraAttacks = normalizeExtraAttacksText(formData.extraAttacksText);
  put("extraAttacks", extraAttacks);

  const suppressions = [];
  if (formData.suppressNaturalAttack === true) suppressions.push("naturalAttack");
  if (formData.suppressAbilityDamage === true) suppressions.push("abilityDamage");
  put("suppressedBonuses", suppressions.join(","));

  for (const key of Object.keys(updates)) {
    if (!key.includes(".-=")) continue;
    const field = key.slice("system.flags.dictionary.-=".length);
    if (Object.hasOwn(currentDictionary, field)) continue;
    delete updates[key];
  }

  return updates;
}

export function buildWeaponAttackSummary(formData, localize = defaultLocalize) {
  if (formData.enabled !== true) return { enabled: false, parts: [], label: "" };

  const parts = [
    filterSummary(formData.filter, localize),
    damageModeSummary(formData.damageMode, localize),
  ];
  if (formData.charge === true) parts.push(localize("NarutoD20.WeaponAttack.Summary.Charge"));

  const attackCount = 1 + countExtraAttacks(formData.extraAttacksText);
  if (attackCount > 1) {
    parts.push(
      localize("NarutoD20.WeaponAttack.Summary.Attacks", {
        count: attackCount,
      }),
    );
  }
  if (formData.iteratives === false) {
    parts.push(localize("NarutoD20.WeaponAttack.Summary.NoIteratives"));
  }

  return {
    enabled: true,
    parts,
    label: parts.join(" · "),
  };
}

export function weaponAttackFormDataFromForm(formData) {
  return {
    enabled: formData["system.weaponAttack.enabled"] === true,
    preset: String(formData["system.weaponAttack.preset"] ?? "custom"),
    filter: String(formData["system.weaponAttack.filter"] ?? "meleeWeapon"),
    damageMode: String(formData["system.weaponAttack.damageMode"] ?? "add"),
    attackBonus: String(formData["system.weaponAttack.attackBonus"] ?? ""),
    damageBonus: String(formData["system.weaponAttack.damageBonus"] ?? ""),
    nonCritDamageBonus: String(formData["system.weaponAttack.nonCritDamageBonus"] ?? ""),
    extraAttacksText: String(formData["system.weaponAttack.extraAttacksText"] ?? ""),
    held: String(formData["system.weaponAttack.held"] ?? ""),
    charge: formData["system.weaponAttack.charge"] === true,
    iteratives: formData["system.weaponAttack.iteratives"] === true,
    suppressNaturalAttack: formData["system.weaponAttack.suppressNaturalAttack"] === true,
    suppressAbilityDamage: formData["system.weaponAttack.suppressAbilityDamage"] === true,
  };
}

export function removeSyntheticWeaponAttackFormFields(formData) {
  for (const key of Object.keys(formData)) {
    if (key.startsWith("system.weaponAttack.")) delete formData[key];
  }
}

function extraAttacksToText(extraAttacks) {
  return (extraAttacks ?? [])
    .map(({ formula, name }) => [formula, name].filter(Boolean).join("|"))
    .join("\n");
}

function countExtraAttacks(extraAttacksText) {
  const normalized = normalizeExtraAttacksText(extraAttacksText);
  if (!normalized) return 0;
  return normalized.split(";").filter(Boolean).length;
}

function filterSummary(filter, localize) {
  if (filter === "unarmedOnly") return localize("NarutoD20.WeaponAttack.Summary.SelectedUnarmed");
  if (filter === "rangedWeapon") return localize("NarutoD20.WeaponAttack.Summary.SelectedRanged");
  if (filter === "meleeOrUnarmed")
    return localize("NarutoD20.WeaponAttack.Summary.SelectedMeleeOrUnarmed");
  return localize("NarutoD20.WeaponAttack.Summary.SelectedMelee");
}

function damageModeSummary(damageMode, localize) {
  if (damageMode === "replace") return localize("NarutoD20.WeaponAttack.Summary.ReplaceDamage");
  return localize("NarutoD20.WeaponAttack.Summary.AddDamage");
}

function defaultLocalize(key, data = {}) {
  const dictionary = {
    "NarutoD20.WeaponAttack.Summary.SelectedUnarmed": "Selected Unarmed",
    "NarutoD20.WeaponAttack.Summary.SelectedRanged": "Selected Ranged",
    "NarutoD20.WeaponAttack.Summary.SelectedMeleeOrUnarmed": "Selected Melee/Unarmed",
    "NarutoD20.WeaponAttack.Summary.SelectedMelee": "Selected Melee",
    "NarutoD20.WeaponAttack.Summary.ReplaceDamage": "Replace damage",
    "NarutoD20.WeaponAttack.Summary.AddDamage": "Add damage",
    "NarutoD20.WeaponAttack.Summary.Charge": "charge",
    "NarutoD20.WeaponAttack.Summary.NoIteratives": "no iteratives",
  };
  if (key === "NarutoD20.WeaponAttack.Summary.Attacks") return `${data.count} attacks`;
  return dictionary[key] ?? key;
}
```

- [ ] **Step 2: Run the focused helper tests**

Run:

```bash
node --test tests/weapon-attack-sheet.test.mjs
```

Expected:

```text
# pass
```

- [ ] **Step 3: Run the full test suite**

Run:

```bash
npm test
```

Expected:

```text
# fail 0
```

- [ ] **Step 4: Commit the helper**

Run:

```bash
git add scripts/features/techniques/weapon-attack-sheet.mjs tests/weapon-attack-sheet.test.mjs
git commit -m "feat(techniques): add weapon attack sheet helpers"
```

---

### Task 3: Wire Helpers Into Technique Sheet Data And Saving

**Files:**
- Modify: `scripts/features/techniques/sheet.mjs`
- Test: `tests/weapon-attack-sheet.test.mjs`

- [ ] **Step 1: Add imports to `sheet.mjs`**

In `scripts/features/techniques/sheet.mjs`, add this import after the existing local feature imports:

```js
import {
  applyWeaponAttackPreset,
  buildWeaponAttackDictionaryUpdates,
  buildWeaponAttackFormData,
  buildWeaponAttackSummary,
  removeSyntheticWeaponAttackFormFields,
  WEAPON_ATTACK_DAMAGE_MODE_CHOICES,
  WEAPON_ATTACK_FILTER_CHOICES,
  WEAPON_ATTACK_HELD_CHOICES,
  WEAPON_ATTACK_PRESET_CHOICES,
  weaponAttackFormDataFromForm,
} from "./weapon-attack-sheet.mjs";
```

- [ ] **Step 2: Add render context in `getData()`**

In `getData(options)`, after `context.empowerFields = { ... }`, add:

```js
      const localizeOrFormat = (key, data = {}) =>
        Object.keys(data).length ? game.i18n.format(key, data) : game.i18n.localize(key);
      context.weaponAttack = buildWeaponAttackFormData(item);
      context.weaponAttackSummary = buildWeaponAttackSummary(
        context.weaponAttack,
        localizeOrFormat,
      );
      context.weaponAttackFilterChoices = localizeChoices(WEAPON_ATTACK_FILTER_CHOICES);
      context.weaponAttackDamageModeChoices = localizeChoices(WEAPON_ATTACK_DAMAGE_MODE_CHOICES);
      context.weaponAttackHeldChoices = localizeChoices(WEAPON_ATTACK_HELD_CHOICES);
      context.weaponAttackPresetChoices = localizeChoices(WEAPON_ATTACK_PRESET_CHOICES);
```

- [ ] **Step 3: Add a localize helper function**

Below `const SPECIAL_DESCRIPTOR_FLAGS = { ... };`, add:

```js
function localizeChoices(choices) {
  return Object.fromEntries(
    Object.entries(choices).map(([key, label]) => [key, game.i18n.localize(label)]),
  );
}
```

- [ ] **Step 4: Normalize weapon attack form fields in `_updateObject()`**

In `_updateObject(event, formData)`, before `return super._updateObject(event, formData);`, add:

```js
      const weaponAttackForm = weaponAttackFormDataFromForm(formData);
      const preset = weaponAttackForm.preset;
      const normalizedWeaponAttack =
        preset && preset !== "custom"
          ? applyWeaponAttackPreset(preset, weaponAttackForm)
          : weaponAttackForm;
      const weaponAttackUpdates = buildWeaponAttackDictionaryUpdates(
        normalizedWeaponAttack,
        this.item.system.flags?.dictionary ?? {},
      );
      removeSyntheticWeaponAttackFormFields(formData);
      Object.assign(formData, weaponAttackUpdates);
```

- [ ] **Step 5: Add a preset-change listener**

In `activateListeners(html)`, after the existing `.descriptor-checkbox` listener, add:

```js
      html.on("change", "select[name='system.weaponAttack.preset']", this._onWeaponAttackPreset.bind(this));
```

Then add this method near the other listener methods:

```js
    _onWeaponAttackPreset(event) {
      const preset = event.currentTarget.value;
      if (!preset || preset === "custom") return;

      const form = event.currentTarget.form;
      const get = (name) => form.elements.namedItem(name);
      const current = {
        enabled: get("system.weaponAttack.enabled")?.checked === true,
        preset,
        filter: get("system.weaponAttack.filter")?.value ?? "meleeWeapon",
        damageMode: get("system.weaponAttack.damageMode")?.value ?? "add",
        attackBonus: get("system.weaponAttack.attackBonus")?.value ?? "",
        damageBonus: get("system.weaponAttack.damageBonus")?.value ?? "",
        nonCritDamageBonus: get("system.weaponAttack.nonCritDamageBonus")?.value ?? "",
        extraAttacksText: get("system.weaponAttack.extraAttacksText")?.value ?? "",
        held: get("system.weaponAttack.held")?.value ?? "",
        charge: get("system.weaponAttack.charge")?.checked === true,
        iteratives: get("system.weaponAttack.iteratives")?.checked === true,
        suppressNaturalAttack:
          get("system.weaponAttack.suppressNaturalAttack")?.checked === true,
        suppressAbilityDamage:
          get("system.weaponAttack.suppressAbilityDamage")?.checked === true,
      };

      const next = applyWeaponAttackPreset(preset, current);
      get("system.weaponAttack.enabled").checked = next.enabled === true;
      get("system.weaponAttack.filter").value = next.filter;
      get("system.weaponAttack.damageMode").value = next.damageMode;
      get("system.weaponAttack.held").value = next.held ?? "";
      get("system.weaponAttack.charge").checked = next.charge === true;
      get("system.weaponAttack.iteratives").checked = next.iteratives !== false;
      get("system.weaponAttack.attackBonus").value = next.attackBonus ?? "";
      get("system.weaponAttack.damageBonus").value = next.damageBonus ?? "";
      get("system.weaponAttack.nonCritDamageBonus").value = next.nonCritDamageBonus ?? "";
      get("system.weaponAttack.extraAttacksText").value = next.extraAttacksText ?? "";
      get("system.weaponAttack.suppressNaturalAttack").checked =
        next.suppressNaturalAttack === true;
      get("system.weaponAttack.suppressAbilityDamage").checked =
        next.suppressAbilityDamage === true;
    }
```

- [ ] **Step 6: Run the existing helper tests**

Run:

```bash
node --test tests/weapon-attack-sheet.test.mjs
```

Expected:

```text
# pass
```

- [ ] **Step 7: Run import validation**

Run:

```bash
npm run validate:imports
```

Expected:

```text
no forbidden imports
```

If the command prints a different success message, record the exact success output in the task completion notes.

- [ ] **Step 8: Commit the sheet data integration**

Run:

```bash
git add scripts/features/techniques/sheet.mjs
git commit -m "feat(techniques): prepare weapon attack sheet state"
```

---

### Task 4: Render The Technique Sheet UI

**Files:**
- Modify: `templates/item/technique-sheet.hbs`
- Modify: `styles/item/technique-sheet.css`

- [ ] **Step 1: Add the Details summary badge**

In `templates/item/technique-sheet.hbs`, inside each action row after `<h4>{{name}}</h4>`, add:

```hbs
                {{#if @root.weaponAttackSummary.enabled}}
                <span class="tag weapon-attack-summary" data-tooltip="{{@root.weaponAttackSummary.label}}">
                  {{@root.weaponAttackSummary.label}}
                </span>
                {{/if}}
```

- [ ] **Step 2: Add the Automation tab section**

In `templates/item/technique-sheet.hbs`, inside the `automation` tab after the main automation enabled checkbox and before the `Empower` header, add:

```hbs
      <h3 class="form-header">{{localize "NarutoD20.WeaponAttack.Header"}}</h3>

      <div class="weapon-attack-config">
        <label class="checkbox">
          <input type="checkbox" name="system.weaponAttack.enabled" {{checked weaponAttack.enabled}}>
          {{localize "NarutoD20.WeaponAttack.Enabled.Label"}}
        </label>
        <p class="hint">{{localize "NarutoD20.WeaponAttack.Enabled.Hint"}}</p>

        {{#if weaponAttack.enabled}}
        <div class="form-group">
          <label>{{localize "NarutoD20.WeaponAttack.Preset.Label"}}</label>
          <select name="system.weaponAttack.preset">
            {{selectOptions weaponAttackPresetChoices selected=weaponAttack.preset}}
          </select>
          <p class="hint">{{localize "NarutoD20.WeaponAttack.Preset.Hint"}}</p>
        </div>

        <div class="weapon-attack-grid">
          <section>
            <h4>{{localize "NarutoD20.WeaponAttack.Basic.Header"}}</h4>
            <div class="form-group">
              <label>{{localize "NarutoD20.WeaponAttack.Filter.Label"}}</label>
              <select name="system.weaponAttack.filter">
                {{selectOptions weaponAttackFilterChoices selected=weaponAttack.filter}}
              </select>
            </div>
            <div class="form-group">
              <label>{{localize "NarutoD20.WeaponAttack.DamageMode.Label"}}</label>
              <select name="system.weaponAttack.damageMode">
                {{selectOptions weaponAttackDamageModeChoices selected=weaponAttack.damageMode}}
              </select>
            </div>
            <div class="form-group">
              <label>{{localize "NarutoD20.WeaponAttack.Held.Label"}}</label>
              <select name="system.weaponAttack.held">
                {{selectOptions weaponAttackHeldChoices selected=weaponAttack.held}}
              </select>
            </div>
            <label class="checkbox">
              <input type="checkbox" name="system.weaponAttack.charge" {{checked weaponAttack.charge}}>
              {{localize "NarutoD20.WeaponAttack.Charge.Label"}}
            </label>
          </section>

          <section>
            <h4>{{localize "NarutoD20.WeaponAttack.Modifiers.Header"}}</h4>
            <div class="form-group">
              <label>{{localize "NarutoD20.WeaponAttack.AttackBonus.Label"}}</label>
              <input type="text" name="system.weaponAttack.attackBonus" value="{{weaponAttack.attackBonus}}">
            </div>
            <div class="form-group">
              <label>{{localize "NarutoD20.WeaponAttack.DamageBonus.Label"}}</label>
              <input type="text" name="system.weaponAttack.damageBonus" value="{{weaponAttack.damageBonus}}">
            </div>
            <div class="form-group">
              <label>{{localize "NarutoD20.WeaponAttack.NonCritDamageBonus.Label"}}</label>
              <input type="text" name="system.weaponAttack.nonCritDamageBonus" value="{{weaponAttack.nonCritDamageBonus}}">
            </div>
          </section>
        </div>

        <section class="weapon-attack-subsection">
          <h4>{{localize "NarutoD20.WeaponAttack.Combo.Header"}}</h4>
          <div class="form-group stacked">
            <label>{{localize "NarutoD20.WeaponAttack.ExtraAttacks.Label"}}</label>
            <textarea name="system.weaponAttack.extraAttacksText" rows="3">{{weaponAttack.extraAttacksText}}</textarea>
            <p class="hint">{{localize "NarutoD20.WeaponAttack.ExtraAttacks.Hint"}}</p>
          </div>
          <label class="checkbox">
            <input type="checkbox" name="system.weaponAttack.iteratives" {{checked weaponAttack.iteratives}}>
            {{localize "NarutoD20.WeaponAttack.Iteratives.Label"}}
          </label>
        </section>

        <section class="weapon-attack-subsection">
          <h4>{{localize "NarutoD20.WeaponAttack.Suppression.Header"}}</h4>
          <label class="checkbox">
            <input type="checkbox" name="system.weaponAttack.suppressNaturalAttack" {{checked weaponAttack.suppressNaturalAttack}}>
            {{localize "NarutoD20.WeaponAttack.SuppressNaturalAttack.Label"}}
          </label>
          <label class="checkbox">
            <input type="checkbox" name="system.weaponAttack.suppressAbilityDamage" {{checked weaponAttack.suppressAbilityDamage}}>
            {{localize "NarutoD20.WeaponAttack.SuppressAbilityDamage.Label"}}
          </label>
        </section>

        {{#if weaponAttack.warnings.length}}
        <div class="weapon-attack-warnings">
          <strong>{{localize "NarutoD20.WeaponAttack.Warnings.Label"}}</strong>
          <ul>
            {{#each weaponAttack.warnings}}
            <li>{{this}}</li>
            {{/each}}
          </ul>
        </div>
        {{/if}}
        {{/if}}
      </div>
```

- [ ] **Step 3: Add CSS for the new UI**

Append this CSS to `styles/item/technique-sheet.css`:

```css
.pf1.sheet.item .weapon-attack-config {
  border: 1px solid rgba(120, 96, 54, 0.35);
  border-radius: 4px;
  margin-bottom: 10px;
  padding: 8px;
}

.pf1.sheet.item .weapon-attack-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.pf1.sheet.item .weapon-attack-grid h4,
.pf1.sheet.item .weapon-attack-subsection h4 {
  border-bottom: 1px solid rgba(120, 96, 54, 0.25);
  margin: 4px 0 6px;
  padding-bottom: 2px;
}

.pf1.sheet.item .weapon-attack-subsection {
  margin-top: 8px;
}

.pf1.sheet.item .weapon-attack-summary {
  display: inline-block;
  margin-left: 6px;
  max-width: 260px;
  overflow: hidden;
  text-overflow: ellipsis;
  vertical-align: middle;
  white-space: nowrap;
}

.pf1.sheet.item .weapon-attack-warnings {
  background: rgba(155, 70, 40, 0.12);
  border: 1px solid rgba(155, 70, 40, 0.35);
  border-radius: 4px;
  margin-top: 8px;
  padding: 6px 8px;
}

.pf1.sheet.item .weapon-attack-warnings ul {
  margin: 4px 0 0 18px;
  padding: 0;
}
```

- [ ] **Step 4: Run Handlebars-adjacent sanity check via formatting**

Run:

```bash
npm run lint:format
```

Expected:

```text
All matched files use Prettier code style!
```

- [ ] **Step 5: Commit template and CSS**

Run:

```bash
git add templates/item/technique-sheet.hbs styles/item/technique-sheet.css
git commit -m "feat(techniques): render weapon attack automation editor"
```

---

### Task 5: Add Localization

**Files:**
- Modify: `lang/en.json`
- Modify: `lang/pt-BR.json`

- [ ] **Step 1: Add English localization keys**

In `lang/en.json`, inside the top-level `NarutoD20` object near the existing `Automation` and `Empower` keys, add:

```json
"WeaponAttack": {
  "Header": "Weapon Attack Automation",
  "Enabled": {
    "Label": "Use selected actor attack",
    "Hint": "Roll through one of the actor's weapon or unarmed attacks, then apply this technique's action details."
  },
  "Preset": {
    "Label": "Quick model",
    "Hint": "Presets fill the fields below. Runtime uses the explicit field values, not the preset name.",
    "Custom": "Custom",
    "Raite": "Raite-like: selected unarmed, replace damage",
    "JikiUchi": "Jiki-Uchi-like: selected melee/unarmed, add bonuses",
    "Ryuutsuki": "Ryuutsuki-like: selected melee/unarmed, charge",
    "FixedCombo": "Fixed combo: selected attack, fixed extra attacks"
  },
  "Basic": {
    "Header": "Basic"
  },
  "Filter": {
    "Label": "Attack filter",
    "MeleeWeapon": "Melee weapon",
    "RangedWeapon": "Ranged weapon",
    "UnarmedOnly": "Unarmed only",
    "MeleeOrUnarmed": "Melee or unarmed"
  },
  "DamageMode": {
    "Label": "Damage mode",
    "Add": "Add technique bonuses to selected attack damage",
    "Replace": "Replace selected attack damage with technique action damage"
  },
  "Held": {
    "Label": "Held as",
    "Unchanged": "Unchanged",
    "OneHanded": "One-handed",
    "TwoHanded": "Two-handed"
  },
  "Charge": {
    "Label": "Treat use as a charge"
  },
  "Modifiers": {
    "Header": "Modifiers"
  },
  "AttackBonus": {
    "Label": "Attack bonus"
  },
  "DamageBonus": {
    "Label": "Damage bonus"
  },
  "NonCritDamageBonus": {
    "Label": "Non-critical damage bonus"
  },
  "Combo": {
    "Header": "Combo"
  },
  "ExtraAttacks": {
    "Label": "Extra attacks",
    "Hint": "One attack per line using formula|name, for example: 0|Second Attack."
  },
  "Iteratives": {
    "Label": "Include normal BAB iterative attacks"
  },
  "Suppression": {
    "Header": "Rare suppressions"
  },
  "SuppressNaturalAttack": {
    "Label": "Suppress selected natural attack bonuses"
  },
  "SuppressAbilityDamage": {
    "Label": "Suppress selected attack ability damage"
  },
  "Warnings": {
    "Label": "Configuration warnings"
  },
  "Summary": {
    "SelectedUnarmed": "Selected Unarmed",
    "SelectedRanged": "Selected Ranged",
    "SelectedMeleeOrUnarmed": "Selected Melee/Unarmed",
    "SelectedMelee": "Selected Melee",
    "ReplaceDamage": "Replace damage",
    "AddDamage": "Add damage",
    "Charge": "charge",
    "Attacks": "{count} attacks",
    "NoIteratives": "no iteratives"
  }
}
```

Ensure the surrounding JSON commas are valid.

- [ ] **Step 2: Add Portuguese localization keys**

In `lang/pt-BR.json`, inside the top-level `NarutoD20` object near the existing `Automation` and `Empower` keys, add:

```json
"WeaponAttack": {
  "Header": "Automação de Ataque com Arma",
  "Enabled": {
    "Label": "Usar ataque selecionado do ator",
    "Hint": "Rola por uma arma ou ataque desarmado do ator e depois aplica os detalhes da ação desta técnica."
  },
  "Preset": {
    "Label": "Modelo rápido",
    "Hint": "Modelos preenchem os campos abaixo. A execução usa os campos explícitos, não o nome do modelo.",
    "Custom": "Customizado",
    "Raite": "Como Raite: desarmado selecionado, substituir dano",
    "JikiUchi": "Como Jiki-Uchi: melee/desarmado, somar bônus",
    "Ryuutsuki": "Como Ryuutsuki: melee/desarmado, charge",
    "FixedCombo": "Combo fixo: ataque selecionado, ataques extras fixos"
  },
  "Basic": {
    "Header": "Básico"
  },
  "Filter": {
    "Label": "Filtro de ataque",
    "MeleeWeapon": "Arma melee",
    "RangedWeapon": "Arma ranged",
    "UnarmedOnly": "Apenas desarmado",
    "MeleeOrUnarmed": "Melee ou desarmado"
  },
  "DamageMode": {
    "Label": "Modo de dano",
    "Add": "Somar bônus da técnica ao dano do ataque selecionado",
    "Replace": "Substituir dano do ataque selecionado pelo dano da ação da técnica"
  },
  "Held": {
    "Label": "Empunhadura",
    "Unchanged": "Sem alteração",
    "OneHanded": "Uma mão",
    "TwoHanded": "Duas mãos"
  },
  "Charge": {
    "Label": "Tratar uso como charge"
  },
  "Modifiers": {
    "Header": "Modificadores"
  },
  "AttackBonus": {
    "Label": "Bônus de ataque"
  },
  "DamageBonus": {
    "Label": "Bônus de dano"
  },
  "NonCritDamageBonus": {
    "Label": "Bônus de dano não-crítico"
  },
  "Combo": {
    "Header": "Combo"
  },
  "ExtraAttacks": {
    "Label": "Ataques extras",
    "Hint": "Um ataque por linha usando formula|nome, por exemplo: 0|Second Attack."
  },
  "Iteratives": {
    "Label": "Incluir ataques iterativos normais por BAB"
  },
  "Suppression": {
    "Header": "Supressões raras"
  },
  "SuppressNaturalAttack": {
    "Label": "Suprimir bônus do ataque natural selecionado"
  },
  "SuppressAbilityDamage": {
    "Label": "Suprimir dano por habilidade do ataque selecionado"
  },
  "Warnings": {
    "Label": "Avisos de configuração"
  },
  "Summary": {
    "SelectedUnarmed": "Desarmado Selecionado",
    "SelectedRanged": "Ranged Selecionado",
    "SelectedMeleeOrUnarmed": "Melee/Desarmado Selecionado",
    "SelectedMelee": "Melee Selecionado",
    "ReplaceDamage": "Substitui dano",
    "AddDamage": "Soma dano",
    "Charge": "charge",
    "Attacks": "{count} ataques",
    "NoIteratives": "sem iterativos"
  }
}
```

Ensure the surrounding JSON commas are valid.

- [ ] **Step 3: Validate JSON formatting**

Run:

```bash
node -e "JSON.parse(require('fs').readFileSync('lang/en.json', 'utf8')); JSON.parse(require('fs').readFileSync('lang/pt-BR.json', 'utf8')); console.log('localization json ok')"
```

Expected:

```text
localization json ok
```

- [ ] **Step 4: Run formatting check**

Run:

```bash
npm run lint:format
```

Expected:

```text
All matched files use Prettier code style!
```

- [ ] **Step 5: Commit localization**

Run:

```bash
git add lang/en.json lang/pt-BR.json
git commit -m "feat(techniques): localize weapon attack automation ui"
```

---

### Task 6: Verify End-To-End Behavior

**Files:**
- Modify only if verification finds a concrete defect:
  - `scripts/features/techniques/weapon-attack-sheet.mjs`
  - `scripts/features/techniques/sheet.mjs`
  - `templates/item/technique-sheet.hbs`
  - `styles/item/technique-sheet.css`
  - `lang/en.json`
  - `lang/pt-BR.json`

- [ ] **Step 1: Run automated checks**

Run:

```bash
npm test
npm run validate:imports
npm run lint:js
npm run lint:css
npm run lint:format
```

Expected:

```text
npm test: fail 0
npm run validate:imports: success
npm run lint:js: no lint errors
npm run lint:css: no lint errors
npm run lint:format: All matched files use Prettier code style!
```

- [ ] **Step 2: Manual Foundry check for Raite-like behavior**

In Foundry VTT 13 with PF1e v11.11+:

1. Create or duplicate a technique on an actor.
2. Open the technique sheet.
3. Go to `Automation`.
4. Enable `Use selected actor attack`.
5. Select the `Raite-like` preset.
6. Save and reopen the sheet.
7. Confirm the fields show `Unarmed only` and `Replace selected attack damage with technique action damage`.
8. Use the technique action.
9. Confirm the unarmed selector opens.
10. Confirm the resulting chat card uses the selected unarmed attack roll and the technique action damage.

- [ ] **Step 3: Manual Foundry check for Jiki-Uchi-like behavior**

In the same world:

1. Create or duplicate a technique on an actor with a melee weapon and an unarmed attack.
2. Enable weapon attack automation.
3. Select `Jiki-Uchi-like`.
4. Set `Attack bonus` to `2[Jiki-Uchi]`.
5. Set `Damage bonus` to `2[Jiki-Uchi]`.
6. Save and reopen the sheet.
7. Confirm the Details action row shows a selected melee/unarmed summary.
8. Use the technique.
9. Confirm the selector includes eligible melee and unarmed attacks.
10. Confirm the roll receives the configured attack and damage bonuses.

- [ ] **Step 4: Manual Foundry check for Ryuutsuki-like behavior**

In the same world:

1. Create or duplicate a technique on an actor with a valid melee or unarmed attack.
2. Enable weapon attack automation.
3. Select `Ryuutsuki-like`.
4. Set `Attack bonus` to `1[Ryuutsuki]`.
5. Save and use the technique.
6. Confirm the selected PF1e use receives the charge option.
7. Confirm the existing charge-defense automation still applies after the PF1e action use.

- [ ] **Step 5: Manual Foundry check for Juuroku Rendan style behavior**

In the same world:

1. Open `TAIJUTSU: JUUROKU RENDAN` from the compendium or an actor copy.
2. Confirm the new UI reads existing dotted flags correctly.
3. Confirm `Extra attacks` displays:

```text
0|Second Attack
0|Third Attack
```

4. Confirm `Include normal BAB iterative attacks` is unchecked.
5. Use the technique with a high-BAB actor.
6. Confirm the resulting card rolls exactly three attacks and no BAB iteratives.

- [ ] **Step 6: Manual preservation check for unrelated dictionary flags**

In Foundry:

1. Add a dictionary flag unrelated to weapon automation, for example `custom.test = keep`.
2. Toggle `Use selected actor attack` on and save.
3. Toggle `Use selected actor attack` off and save.
4. Confirm `custom.test = keep` remains present.
5. Confirm all `weaponAttack.*` keys are removed when the automation is disabled.

- [ ] **Step 7: Commit verification fixes after defects are fixed**

If any concrete defect was fixed during manual verification, commit only those fixes:

```bash
git add scripts/features/techniques/weapon-attack-sheet.mjs scripts/features/techniques/sheet.mjs templates/item/technique-sheet.hbs styles/item/technique-sheet.css lang/en.json lang/pt-BR.json tests/weapon-attack-sheet.test.mjs
git commit -m "fix(techniques): polish weapon attack automation ui"
```

If no defects were found, do not create an empty commit.

---

## Final Completion Checklist

- [ ] `npm test` passes.
- [ ] `npm run validate:imports` passes.
- [ ] `npm run lint:js` passes.
- [ ] `npm run lint:css` passes.
- [ ] `npm run lint:format` passes.
- [ ] Foundry manual checks cover Raite-like, Jiki-Uchi-like, Ryuutsuki-like, Juuroku Rendan style, normal disabled flow, and unrelated dictionary flag preservation.
- [ ] `git status --short` contains no unexpected tracked changes.
- [ ] `.superpowers/` remains untracked or is ignored by a separate cleanup decision.
