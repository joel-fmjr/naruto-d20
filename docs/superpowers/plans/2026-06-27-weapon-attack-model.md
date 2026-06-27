# Weapon-attack Model Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move technique weapon-attack automation config out of PF1e's generic `system.flags.dictionary` into a first-class typed `system.weaponAttack` SchemaField on `TechniqueDataModel`, eliminating the dotted-key/`mergeObject` write fragility behind the "single change resets the sheet" bug.

**Architecture:** A dependency-free transform module (`weapon-attack-migrate.mjs`) is the single source of truth for converting legacy dictionary data → typed object; it is reused by the model's `migrateData`, the synckit normalizer, the GM actor migration, the offline compendium-rewrite script, and the unit tests. The sheet form binds natively to `system.weaponAttack.*`; the only non-native field is the extra-attacks textarea (text↔array conversion confined to one helper pair). All runtime reads switch to the typed field; the entire dictionary-parsing/validation/warnings layer is deleted.

**Tech Stack:** Foundry VTT v13 + PF1e v11.11, ESM (no build step), `node:test` unit tests, `@foundryvtt/foundryvtt-cli` for compendium pack/unpack.

## Global Constraints

- **Branch:** continue on `docs/technique-weapon-automation-ui` (the weapon-attack UI this depends on is 13 commits ahead of `master`, not yet merged). Do NOT branch off `master`. Do NOT commit to `master`.
- **PF1e v11.11 only** — before referencing any `pf1.*`, `CONFIG.PF1.*`, `system.*`, or `"PF1.*"` i18n key, use the `pf1e-api-check` skill. Trust the `foundryvtt-pathfinder1-v11.11/` source mirror, never `/systems/pf1/pf1.js` or context7 as a spec.
- **Application V1** for any Foundry app class (the technique sheet already extends `ItemSheet` V1 — keep it).
- **No new module data outside `flags["naruto-d20"].*`** except `item.system.*` TypeDataModel fields (this feature is exactly such a field).
- **`weapon-attack-migrate.mjs` must import no Foundry/pf1 globals** (no `foundry.*`, no `pf1.*`) so the offline node script and unit tests can import it directly.
- **Compendium repack:** rebuild via `npm run pack` only; NEVER `npm run unpack` (duplicate-filename landmine).
- **Run `npm test` and `npm run lint` green before every commit.** Commit messages end with `Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>`.

## File map

- **Create** `scripts/features/techniques/weapon-attack-migrate.mjs` — pure legacy→typed transform + `hasLegacyWeaponAttack` predicate.
- **Modify** `scripts/features/techniques/model.mjs` — add `weaponAttack` SchemaField; call the transform in `migrateData`.
- **Modify** `scripts/features/techniques/defaults.mjs` — add `weaponAttack` defaults block.
- **Modify** `scripts/features/techniques/weapon-attack-sheet.mjs` — drop dictionary helpers; add text↔array helpers; typed form data.
- **Modify** `scripts/features/techniques/weapon-attack.mjs` — typed `getTechniqueWeaponAttackConfig`; delete the parse/validation/warnings layer.
- **Modify** `scripts/features/techniques/sheet.mjs` — native form binding; trimmed `_updateObject`; preset handler.
- **Modify** `templates/item/technique-sheet.hbs` — preset/textarea field names; remove warnings block.
- **Modify** `scripts/features/techniques/sync.mjs` — run the transform inside `normalizeSystem`.
- **Modify** `scripts/data/maintenance-migration.mjs` + `scripts/lifecycle/ready.mjs` — GM actor migration (version 3).
- **Create** `tools/migrate-weapon-attack.mjs` — offline compendium-source rewrite.
- **Modify** `lang/en.json`, `lang/pt-BR.json` — remove dead i18n keys.
- **Modify tests:** `tests/helpers.test.mjs`, `tests/weapon-attack-sheet.test.mjs`, `tests/weapon-attack-iteratives.test.mjs`, `tests/technique-bonus-suppression.test.mjs`, `tests/technique-damage-transform.test.mjs`.

---

### Task 1: Pure legacy→typed transform module

**Files:**
- Create: `scripts/features/techniques/weapon-attack-migrate.mjs`
- Test: `tests/weapon-attack-migrate.test.mjs` (new)

**Interfaces:**
- Produces: `migrateLegacyWeaponAttack(source) -> source` (mutates `source` in place: builds typed `source.weaponAttack` from legacy `source.flags.dictionary` weaponAttack keys — both `weaponAttack.<k>` dotted and nested `weaponAttack:{}` shapes, nested wins — then deletes those dictionary keys; no-op when no legacy keys or already typed). Typed shape: `{ enabled, filter, damageMode, held, charge, iteratives, attackBonus, damageBonus, nonCritDamageBonus, extraAttacks: [{formula,name}], suppressNaturalAttack, suppressAbilityDamage }`.
- Produces: `hasLegacyWeaponAttack(system) -> boolean`.

- [ ] **Step 1: Write the failing test**

Create `tests/weapon-attack-migrate.test.mjs`:

```js
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  hasLegacyWeaponAttack,
  migrateLegacyWeaponAttack,
} from "../scripts/features/techniques/weapon-attack-migrate.mjs";

describe("hasLegacyWeaponAttack", () => {
  it("detects dotted and nested legacy keys, ignores clean systems", () => {
    assert.equal(
      hasLegacyWeaponAttack({ flags: { dictionary: { "weaponAttack.mode": "selected" } } }),
      true,
    );
    assert.equal(
      hasLegacyWeaponAttack({ flags: { dictionary: { weaponAttack: { mode: "selected" } } } }),
      true,
    );
    assert.equal(hasLegacyWeaponAttack({ flags: { dictionary: { other: 1 } } }), false);
    assert.equal(hasLegacyWeaponAttack({ weaponAttack: { enabled: true } }), false);
    assert.equal(hasLegacyWeaponAttack({}), false);
  });
});

describe("migrateLegacyWeaponAttack", () => {
  it("converts dotted legacy keys to a typed object and strips them", () => {
    const source = {
      flags: {
        dictionary: {
          "weaponAttack.mode": "selected",
          "weaponAttack.filter": "unarmedOnly",
          "weaponAttack.damageMode": "replace",
          "weaponAttack.attackBonus": "-5",
          "weaponAttack.extraAttacks": "0|Second Attack;0|Third Attack",
          "weaponAttack.iteratives": "false",
          "weaponAttack.suppressedBonuses": "naturalAttack,abilityDamage",
          unrelated: "kept",
        },
      },
    };

    migrateLegacyWeaponAttack(source);

    assert.deepEqual(source.weaponAttack, {
      enabled: true,
      filter: "unarmedOnly",
      damageMode: "replace",
      held: "",
      charge: false,
      iteratives: false,
      attackBonus: "-5",
      damageBonus: "",
      nonCritDamageBonus: "",
      extraAttacks: [
        { formula: "0", name: "Second Attack" },
        { formula: "0", name: "Third Attack" },
      ],
      suppressNaturalAttack: true,
      suppressAbilityDamage: true,
    });
    assert.deepEqual(source.flags.dictionary, { unrelated: "kept" });
  });

  it("prefers the nested object over dotted keys and coerces charge", () => {
    const source = {
      flags: {
        dictionary: {
          weaponAttack: { mode: "selected", filter: "rangedWeapon", charge: "true" },
          "weaponAttack.filter": "unarmedOnly",
        },
      },
    };

    migrateLegacyWeaponAttack(source);

    assert.equal(source.weaponAttack.filter, "rangedWeapon");
    assert.equal(source.weaponAttack.charge, true);
    assert.equal(source.weaponAttack.iteratives, true);
    assert.deepEqual(source.flags.dictionary, {});
  });

  it("coerces an invalid enum to its default", () => {
    const source = { flags: { dictionary: { "weaponAttack.mode": "selected", "weaponAttack.filter": "bogus" } } };
    migrateLegacyWeaponAttack(source);
    assert.equal(source.weaponAttack.filter, "meleeWeapon");
  });

  it("is a no-op on a clean or already-typed system", () => {
    const clean = { flags: { dictionary: { other: 1 } } };
    migrateLegacyWeaponAttack(clean);
    assert.equal(clean.weaponAttack, undefined);

    const typed = {
      weaponAttack: { enabled: true, filter: "meleeWeapon" },
      flags: { dictionary: {} },
    };
    migrateLegacyWeaponAttack(typed);
    assert.deepEqual(typed.weaponAttack, { enabled: true, filter: "meleeWeapon" });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/weapon-attack-migrate.test.mjs`
Expected: FAIL — `Cannot find module '.../weapon-attack-migrate.mjs'`.

- [ ] **Step 3: Write minimal implementation**

Create `scripts/features/techniques/weapon-attack-migrate.mjs`:

```js
/**
 * Naruto D20 — Legacy weapon-attack migration (dependency-free).
 *
 * Single source of truth for converting the old
 * `system.flags.dictionary` weaponAttack data (dotted `weaponAttack.<k>` keys
 * or a nested `weaponAttack:{}` object) into the typed `system.weaponAttack`
 * shape. Imported by model.migrateData, sync.normalizeSystem, the GM actor
 * migration, the offline compendium script, and the unit tests — so it MUST
 * NOT import any Foundry/pf1 globals.
 */

const FILTERS = new Set(["meleeWeapon", "rangedWeapon", "unarmedOnly", "meleeOrUnarmed"]);
const DAMAGE_MODES = new Set(["add", "replace"]);
const HELD = new Set(["", "onehanded", "twohanded"]);

/** True when a technique system still carries legacy dictionary weaponAttack data. */
export function hasLegacyWeaponAttack(system) {
  const dict = system?.flags?.dictionary;
  if (!dict || typeof dict !== "object") return false;
  return Object.keys(dict).some((k) => k === "weaponAttack" || k.startsWith("weaponAttack."));
}

function readLegacyValues(dict) {
  const values = {};
  for (const key of Object.keys(dict)) {
    if (key.startsWith("weaponAttack.")) values[key.slice("weaponAttack.".length)] = dict[key];
  }
  const nested = dict.weaponAttack && typeof dict.weaponAttack === "object" ? dict.weaponAttack : null;
  if (nested) for (const k of Object.keys(nested)) values[k] = nested[k]; // nested wins
  return values;
}

function parseExtraAttacks(raw) {
  return String(raw ?? "")
    .split(";")
    .map((entry) => {
      const [formula, name] = entry.split("|").map((s) => s.trim());
      return { formula: formula ?? "", name: name ?? "" };
    })
    .filter((e) => e.formula);
}

/**
 * Mutate `source` in place: build typed `source.weaponAttack` from legacy
 * dictionary keys and strip those keys. No-op when no legacy keys are present.
 * Returns `source`.
 */
export function migrateLegacyWeaponAttack(source) {
  if (!source || typeof source !== "object") return source;
  if (!hasLegacyWeaponAttack(source)) return source;

  const dict = source.flags.dictionary;
  const alreadyTyped =
    source.weaponAttack && typeof source.weaponAttack === "object" &&
    source.weaponAttack.enabled !== undefined;

  if (!alreadyTyped) {
    const values = readLegacyValues(dict);
    const str = (k) => String(values[k] ?? "").trim();
    const suppressions = str("suppressedBonuses")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    source.weaponAttack = {
      enabled: str("mode") === "selected",
      filter: FILTERS.has(str("filter")) ? str("filter") : "meleeWeapon",
      damageMode: DAMAGE_MODES.has(str("damageMode")) ? str("damageMode") : "add",
      held: HELD.has(str("held")) ? str("held") : "",
      charge: str("charge").toLowerCase() === "true",
      iteratives: str("iteratives").toLowerCase() !== "false",
      attackBonus: str("attackBonus"),
      damageBonus: str("damageBonus"),
      nonCritDamageBonus: str("nonCritDamageBonus"),
      extraAttacks: parseExtraAttacks(values.extraAttacks),
      suppressNaturalAttack: suppressions.includes("naturalAttack"),
      suppressAbilityDamage: suppressions.includes("abilityDamage"),
    };
  }

  for (const key of Object.keys(dict)) {
    if (key === "weaponAttack" || key.startsWith("weaponAttack.")) delete dict[key];
  }
  return source;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/weapon-attack-migrate.test.mjs`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add scripts/features/techniques/weapon-attack-migrate.mjs tests/weapon-attack-migrate.test.mjs
git commit -m "feat(techniques): add dependency-free weapon-attack legacy migration

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 2: Schema field + migrateData wiring

**Files:**
- Modify: `scripts/features/techniques/model.mjs`
- Test: `tests/helpers.test.mjs` (new schema-introspection assertion)

**Interfaces:**
- Consumes: `migrateLegacyWeaponAttack` (Task 1).
- Produces: `system.weaponAttack` SchemaField with sub-fields `enabled, filter, damageMode, held, charge, iteratives, attackBonus, damageBonus, nonCritDamageBonus, extraAttacks, suppressNaturalAttack, suppressAbilityDamage`.

- [ ] **Step 1: Write the failing test**

In `tests/helpers.test.mjs`, inside the existing `describe` that holds the maintenance/empower schema-parity guards (near line 285), add:

```js
it("declares the weaponAttack schema field with all sub-fields", () => {
  const leaf = class {};
  const prevData = globalThis.foundry.data;
  const prevAbstract = globalThis.foundry.abstract;
  globalThis.foundry.abstract = { TypeDataModel: class {} };
  globalThis.foundry.data = {
    fields: {
      SchemaField: class { constructor(schema) { this.fields = schema; } },
      ArrayField: class { constructor(element) { this.element = element; } },
      SetField: class { constructor(element) { this.element = element; } },
      StringField: leaf, NumberField: leaf, BooleanField: leaf, HTMLField: leaf, ObjectField: leaf,
    },
  };
  let keys;
  try {
    const schema = createTechniqueDataModel().defineSchema();
    keys = Object.keys(schema.weaponAttack.fields).sort();
  } finally {
    globalThis.foundry.data = prevData;
    globalThis.foundry.abstract = prevAbstract;
  }
  assert.deepEqual(keys, [
    "attackBonus", "charge", "damageBonus", "damageMode", "enabled", "extraAttacks",
    "filter", "held", "iteratives", "nonCritDamageBonus", "suppressAbilityDamage", "suppressNaturalAttack",
  ]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/helpers.test.mjs`
Expected: FAIL — `Cannot read properties of undefined (reading 'fields')` (schema has no `weaponAttack`).

- [ ] **Step 3: Write minimal implementation**

In `scripts/features/techniques/model.mjs`:

(a) Add the import at the top, alongside the existing `./defaults.mjs` import:

```js
import { migrateLegacyWeaponAttack } from "./weapon-attack-migrate.mjs";
```

(b) In `defineSchema()`, add this field inside the returned object (place it right after the `attackAdjustments` SchemaField):

```js
weaponAttack: new fields.SchemaField(
  {
    enabled: new fields.BooleanField({ ...opt, initial: false }),
    filter: new fields.StringField({
      ...opt, blank: false, initial: "meleeWeapon",
      choices: ["meleeWeapon", "rangedWeapon", "unarmedOnly", "meleeOrUnarmed"],
    }),
    damageMode: new fields.StringField({
      ...opt, blank: false, initial: "add", choices: ["add", "replace"],
    }),
    held: new fields.StringField({
      ...opt, blank: true, initial: "", choices: ["", "onehanded", "twohanded"],
    }),
    charge: new fields.BooleanField({ ...opt, initial: false }),
    iteratives: new fields.BooleanField({ ...opt, initial: true }),
    attackBonus: new fields.StringField({ ...opt, blank: true, initial: "" }),
    damageBonus: new fields.StringField({ ...opt, blank: true, initial: "" }),
    nonCritDamageBonus: new fields.StringField({ ...opt, blank: true, initial: "" }),
    extraAttacks: new fields.ArrayField(
      new fields.SchemaField({
        formula: new fields.StringField({ ...opt, blank: true, initial: "" }),
        name: new fields.StringField({ ...opt, blank: true, initial: "" }),
      }),
      { ...opt, initial: [] },
    ),
    suppressNaturalAttack: new fields.BooleanField({ ...opt, initial: false }),
    suppressAbilityDamage: new fields.BooleanField({ ...opt, initial: false }),
  },
  opt,
),
```

(c) In `static migrateData(source)`, add this as the **first** line of the method body (before the `automation` handling):

```js
migrateLegacyWeaponAttack(source);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/helpers.test.mjs`
Expected: PASS (new assertion + all existing).

- [ ] **Step 5: Commit**

```bash
git add scripts/features/techniques/model.mjs tests/helpers.test.mjs
git commit -m "feat(techniques): add typed weaponAttack schema field + migrateData hook

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 3: Defaults block + schema-parity guard

**Files:**
- Modify: `scripts/features/techniques/defaults.mjs`
- Test: `tests/helpers.test.mjs`

**Interfaces:**
- Consumes: the `weaponAttack` schema (Task 2).
- Produces: `applyTechniqueSystemDefaults(system).weaponAttack` populated with every schema sub-field.

- [ ] **Step 1: Write the failing test**

In `tests/helpers.test.mjs`, after the empower schema-parity guard (near line 380), add:

```js
it("backfills every weaponAttack field declared in the schema", () => {
  const leaf = class {};
  const prevData = globalThis.foundry.data;
  const prevAbstract = globalThis.foundry.abstract;
  globalThis.foundry.abstract = { TypeDataModel: class {} };
  globalThis.foundry.data = {
    fields: {
      SchemaField: class { constructor(schema) { this.fields = schema; } },
      ArrayField: class { constructor(element) { this.element = element; } },
      SetField: class { constructor(element) { this.element = element; } },
      StringField: leaf, NumberField: leaf, BooleanField: leaf, HTMLField: leaf, ObjectField: leaf,
    },
  };
  let schemaKeys;
  try {
    const schema = createTechniqueDataModel().defineSchema();
    schemaKeys = Object.keys(schema.weaponAttack.fields).sort();
  } finally {
    globalThis.foundry.data = prevData;
    globalThis.foundry.abstract = prevAbstract;
  }
  const normalizerKeys = Object.keys(applyTechniqueSystemDefaults({}).weaponAttack).sort();
  assert.deepEqual(
    normalizerKeys,
    schemaKeys,
    "applyTechniqueSystemDefaults must default every weaponAttack schema field " +
      "(see scripts/features/techniques/defaults.mjs) or synckit will flag unedited techniques out-of-date",
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/helpers.test.mjs`
Expected: FAIL — `Cannot read properties of undefined (reading 'weaponAttack')` (defaults lacks the block).

- [ ] **Step 3: Write minimal implementation**

In `scripts/features/techniques/defaults.mjs`, inside `applyTechniqueSystemDefaults`, add this block right before the final `return system;` (after the `automation.maintenance` defaults):

```js
system.weaponAttack ??= {};
const wa = system.weaponAttack;
wa.enabled ??= false;
wa.filter ??= "meleeWeapon";
wa.damageMode ??= "add";
wa.held ??= "";
wa.charge ??= false;
wa.iteratives ??= true;
wa.attackBonus ??= "";
wa.damageBonus ??= "";
wa.nonCritDamageBonus ??= "";
wa.extraAttacks ??= [];
wa.suppressNaturalAttack ??= false;
wa.suppressAbilityDamage ??= false;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/helpers.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/features/techniques/defaults.mjs tests/helpers.test.mjs
git commit -m "feat(techniques): default weaponAttack fields for synckit parity

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 4: Sheet helpers — drop dictionary machinery, add text↔array

**Files:**
- Modify: `scripts/features/techniques/weapon-attack-sheet.mjs`
- Test: `tests/weapon-attack-sheet.test.mjs` (rewrite)

**Interfaces:**
- Produces: `extraAttacksTextFromArray(array) -> string` (joins `{formula,name}` rows as `"formula|name"` newline-separated; omits empty name), `extraAttacksArrayFromText(text) -> [{formula,name}]` (splits on `;`/newlines, drops empty-formula rows).
- Produces (unchanged): `applyWeaponAttackPreset`, `buildWeaponAttackSummary`, `WEAPON_ATTACK_FILTER_CHOICES`, `WEAPON_ATTACK_DAMAGE_MODE_CHOICES`, `WEAPON_ATTACK_HELD_CHOICES`, `WEAPON_ATTACK_PRESET_CHOICES`, `normalizeExtraAttacksText`.
- Produces: `buildWeaponAttackFormData(item)` now reads the typed `item.system.weaponAttack` and returns the same form-data shape (`{enabled, preset:"custom", filter, damageMode, held, charge, iteratives, attackBonus, damageBonus, nonCritDamageBonus, extraAttacksText, suppressNaturalAttack, suppressAbilityDamage}`).
- **Removed exports:** `buildWeaponAttackDictionaryUpdates`, `weaponAttackFormDataFromForm`, `removeSyntheticWeaponAttackFormFields`, `WEAPON_ATTACK_FIELD_KEYS`.

> This task stops `weapon-attack-sheet.mjs` from importing `readWeaponAttackRaw`/`parseWeaponAttackConfig`, which Task 5 deletes. Do it before Task 5.

- [ ] **Step 1: Write the failing test**

Replace the entire contents of `tests/weapon-attack-sheet.test.mjs` with:

```js
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  applyWeaponAttackPreset,
  buildWeaponAttackFormData,
  buildWeaponAttackSummary,
  extraAttacksArrayFromText,
  extraAttacksTextFromArray,
  normalizeExtraAttacksText,
} from "../scripts/features/techniques/weapon-attack-sheet.mjs";

function itemWithWeaponAttack(weaponAttack) {
  return { system: { weaponAttack } };
}

describe("weapon attack sheet form data (typed field)", () => {
  it("reads an enabled typed config into editable form state", () => {
    const data = buildWeaponAttackFormData(
      itemWithWeaponAttack({
        enabled: true,
        filter: "unarmedOnly",
        damageMode: "replace",
        attackBonus: "-5",
        extraAttacks: [
          { formula: "0", name: "Second Attack" },
          { formula: "0", name: "Third Attack" },
        ],
        iteratives: false,
        suppressNaturalAttack: true,
        suppressAbilityDamage: true,
      }),
    );

    assert.equal(data.enabled, true);
    assert.equal(data.filter, "unarmedOnly");
    assert.equal(data.damageMode, "replace");
    assert.equal(data.attackBonus, "-5");
    assert.equal(data.extraAttacksText, "0|Second Attack\n0|Third Attack");
    assert.equal(data.iteratives, false);
    assert.equal(data.suppressNaturalAttack, true);
    assert.equal(data.suppressAbilityDamage, true);
  });

  it("returns disabled defaults when weaponAttack is absent or disabled", () => {
    const data = buildWeaponAttackFormData(itemWithWeaponAttack({ enabled: false }));
    assert.equal(data.enabled, false);
    assert.equal(data.filter, "meleeWeapon");
    assert.equal(data.damageMode, "add");
    assert.equal(data.iteratives, true);
    assert.equal(data.extraAttacksText, "");
  });
});

describe("weapon attack extra-attacks text<->array", () => {
  it("round-trips text to array and back", () => {
    const array = extraAttacksArrayFromText("0|Second Attack\n-5|Third Attack; |skip");
    assert.deepEqual(array, [
      { formula: "0", name: "Second Attack" },
      { formula: "-5", name: "Third Attack" },
    ]);
    assert.equal(extraAttacksTextFromArray(array), "0|Second Attack\n-5|Third Attack");
  });

  it("omits the pipe when a row has no name", () => {
    assert.equal(extraAttacksTextFromArray([{ formula: "1d6", name: "" }]), "1d6");
  });
});

describe("weapon attack sheet presets", () => {
  it("applies a Raite-like preset", () => {
    const next = applyWeaponAttackPreset("raite", { enabled: false, filter: "meleeWeapon", damageMode: "add" });
    assert.equal(next.enabled, true);
    assert.equal(next.filter, "unarmedOnly");
    assert.equal(next.damageMode, "replace");
  });

  it("keeps current fields for custom preset", () => {
    const current = { enabled: true, filter: "rangedWeapon", damageMode: "add", attackBonus: "1[Test]" };
    assert.deepEqual(applyWeaponAttackPreset("custom", current), current);
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
    assert.deepEqual(buildWeaponAttackSummary({ enabled: false }), { enabled: false, parts: [], label: "" });
  });
});

describe("normalizeExtraAttacksText", () => {
  it("normalizes newline and semicolon separators", () => {
    assert.equal(
      normalizeExtraAttacksText("0|Second Attack\n0|Third Attack; -5|Fourth Attack"),
      "0|Second Attack;0|Third Attack;-5|Fourth Attack",
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/weapon-attack-sheet.test.mjs`
Expected: FAIL — `extraAttacksArrayFromText`/`extraAttacksTextFromArray` not exported; `buildWeaponAttackFormData` still reads the dictionary.

- [ ] **Step 3: Write minimal implementation**

In `scripts/features/techniques/weapon-attack-sheet.mjs`:

(a) **Delete** the first import line `import { parseWeaponAttackConfig, readWeaponAttackRaw } from "./weapon-attack.mjs";`.

(b) **Delete** the exports `WEAPON_ATTACK_FIELD_KEYS`, `buildWeaponAttackDictionaryUpdates`, `weaponAttackFormDataFromForm`, `removeSyntheticWeaponAttackFormFields`.

(c) **Replace** `buildWeaponAttackFormData` with a typed read:

```js
export function buildWeaponAttackFormData(item) {
  const wa = item.system?.weaponAttack;
  if (!wa?.enabled) return { ...DEFAULT_FORM_DATA };
  return {
    ...DEFAULT_FORM_DATA,
    enabled: true,
    filter: wa.filter || "meleeWeapon",
    damageMode: wa.damageMode || "add",
    attackBonus: String(wa.attackBonus ?? ""),
    damageBonus: String(wa.damageBonus ?? ""),
    nonCritDamageBonus: String(wa.nonCritDamageBonus ?? ""),
    extraAttacksText: extraAttacksTextFromArray(wa.extraAttacks),
    held: wa.held ?? "",
    charge: wa.charge === true,
    iteratives: wa.iteratives !== false,
    suppressNaturalAttack: wa.suppressNaturalAttack === true,
    suppressAbilityDamage: wa.suppressAbilityDamage === true,
  };
}
```

(d) Keep `DEFAULT_FORM_DATA` but **remove** the now-unused `warnings: []` field reference only if no longer used; the template no longer renders warnings (Task 6). Leave `preset: "custom"` in `DEFAULT_FORM_DATA`.

(e) **Add** the two helpers (place near `normalizeExtraAttacksText`):

```js
export function extraAttacksTextFromArray(extraAttacks) {
  return (extraAttacks ?? [])
    .map(({ formula, name }) => [String(formula ?? "").trim(), String(name ?? "").trim()].filter(Boolean).join("|"))
    .filter(Boolean)
    .join("\n");
}

export function extraAttacksArrayFromText(text) {
  return String(text ?? "")
    .split(/[;\n]/)
    .map((entry) => {
      const [formula, name] = entry.split("|").map((s) => s.trim());
      return { formula: formula ?? "", name: name ?? "" };
    })
    .filter((e) => e.formula);
}
```

(f) **Delete** the now-unused private helper `extraAttacksToText` (replaced by `extraAttacksTextFromArray`).

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/weapon-attack-sheet.test.mjs`
Expected: PASS.

- [ ] **Step 5: Run the full suite (nothing else should break yet)**

Run: `node --test tests/*.test.mjs`
Expected: PASS — `weapon-attack.mjs` still exports `readWeaponAttackRaw`/`parseWeaponAttackConfig` for the other tests (deleted in Task 5).

- [ ] **Step 6: Commit**

```bash
git add scripts/features/techniques/weapon-attack-sheet.mjs tests/weapon-attack-sheet.test.mjs
git commit -m "refactor(techniques): read typed weaponAttack in sheet helpers

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 5: Runtime read — typed `getTechniqueWeaponAttackConfig`, delete parse/warnings layer

**Files:**
- Modify: `scripts/features/techniques/weapon-attack.mjs`
- Test: `tests/helpers.test.mjs`, `tests/weapon-attack-iteratives.test.mjs`, `tests/technique-bonus-suppression.test.mjs`

**Interfaces:**
- Produces: `getTechniqueWeaponAttackConfig(item)` returns `null` unless `item.system.weaponAttack.enabled`; otherwise the runtime config `{filter, damageMode, attackBonus, damageBonus, nonCritDamageBonus, extraAttacks:[{formula,name}], held, charge, iteratives, suppressedBonuses:string[]}`.
- **Removed exports:** `readWeaponAttackRaw`, `parseWeaponAttackConfig` (and their internal helpers/constants).
- Unchanged exports: `rollSelectedWeaponAttackWithTechnique`, `applyTechniqueBonusSuppressions`, `applyTechniqueElementDamageToActionUse`, `deriveAttackCategories`, `chooseExtraAttacksType`.

- [ ] **Step 1: Write the failing test**

In `tests/helpers.test.mjs`:

(a) Change the weapon-attack import block (lines ~66-69) from:

```js
  deriveAttackCategories,
  parseWeaponAttackConfig,
  readWeaponAttackRaw,
} from "../scripts/features/techniques/weapon-attack.mjs";
```

to:

```js
  deriveAttackCategories,
  getTechniqueWeaponAttackConfig,
} from "../scripts/features/techniques/weapon-attack.mjs";
```

(b) Replace the entire `describe("weaponAttack parsing", …)` block (lines ~757-809) with:

```js
describe("getTechniqueWeaponAttackConfig", () => {
  it("returns null when weaponAttack is absent or disabled", () => {
    assert.equal(getTechniqueWeaponAttackConfig({ system: {} }), null);
    assert.equal(getTechniqueWeaponAttackConfig({ system: { weaponAttack: { enabled: false } } }), null);
  });

  it("maps the typed field to the runtime config", () => {
    const config = getTechniqueWeaponAttackConfig({
      system: {
        weaponAttack: {
          enabled: true,
          filter: "rangedWeapon",
          damageMode: "replace",
          attackBonus: "@cl",
          charge: true,
          iteratives: false,
          extraAttacks: [{ formula: "-5", name: "Second" }, { formula: "", name: "skip" }],
          suppressNaturalAttack: true,
          suppressAbilityDamage: false,
        },
      },
    });
    assert.deepEqual(config, {
      filter: "rangedWeapon",
      damageMode: "replace",
      attackBonus: "@cl",
      damageBonus: "",
      nonCritDamageBonus: "",
      extraAttacks: [{ formula: "-5", name: "Second" }],
      held: "",
      charge: true,
      iteratives: false,
      suppressedBonuses: ["naturalAttack"],
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/helpers.test.mjs`
Expected: FAIL — `getTechniqueWeaponAttackConfig` still reads the dictionary / import mismatch.

- [ ] **Step 3: Write minimal implementation (weapon-attack.mjs)**

(a) **Replace** `getTechniqueWeaponAttackConfig` (lines ~280-287) with:

```js
export function getTechniqueWeaponAttackConfig(item) {
  const wa = item.system?.weaponAttack;
  if (!wa?.enabled) return null;
  return {
    filter: wa.filter || "meleeWeapon",
    damageMode: wa.damageMode || "add",
    attackBonus: String(wa.attackBonus ?? "").trim(),
    damageBonus: String(wa.damageBonus ?? "").trim(),
    nonCritDamageBonus: String(wa.nonCritDamageBonus ?? "").trim(),
    extraAttacks: (Array.isArray(wa.extraAttacks) ? wa.extraAttacks : [])
      .map((e) => ({ formula: String(e?.formula ?? "").trim(), name: String(e?.name ?? "").trim() }))
      .filter((e) => e.formula),
    held: wa.held ?? "",
    charge: wa.charge === true,
    iteratives: wa.iteratives !== false,
    suppressedBonuses: [
      ...(wa.suppressNaturalAttack ? ["naturalAttack"] : []),
      ...(wa.suppressAbilityDamage ? ["abilityDamage"] : []),
    ],
  };
}
```

(b) **Delete** the now-dead dictionary layer from `weapon-attack.mjs`: the functions `readWeaponAttackRaw`, `parseWeaponAttackConfig`, `reportWeaponAttackWarnings`, `formatWeaponAttackIssue`, `formatIssueTemplate`, and the module constants `CONFIG_PREFIX`, `DEFAULT_FILTER`, `DEFAULT_DAMAGE_MODE`, `SUPPORTED_MODES`, `SUPPORTED_FILTERS`, `SUPPORTED_DAMAGE_MODES`, `KNOWN_KEYS`, `SUPPORTED_SUPPRESSED_BONUSES`, `ISSUE_TEMPLATES`. Keep `deepClone`, `getTechniqueAttackAdjustments`, and everything from `applyTechniqueAttackAdjustments` onward (the roll machinery, `deriveAttackCategories`, `categoriesFromFilter`, `chooseExtraAttacksType`, selector helpers).

> After deletion, verify nothing inside the kept code still references a deleted constant (e.g. `selectTechniqueWeaponAttack` uses `categoriesFromFilter`, which stays). `categoriesFromFilter` references the literal filter strings, not the deleted `SUPPORTED_*` sets — OK.

- [ ] **Step 4: Update the two dependent test files**

In `tests/weapon-attack-iteratives.test.mjs`: change the import to drop `parseWeaponAttackConfig`, and replace the `describe("weaponAttack iteratives parsing", …)` block with a migration-based equivalent. New file head + block:

```js
import {
  chooseExtraAttacksType,
} from "../scripts/features/techniques/weapon-attack.mjs";
import { migrateLegacyWeaponAttack } from "../scripts/features/techniques/weapon-attack-migrate.mjs";

describe("weaponAttack iteratives migration", () => {
  const migrate = (extra) => {
    const source = { flags: { dictionary: { "weaponAttack.mode": "selected", ...extra } } };
    migrateLegacyWeaponAttack(source);
    return source.weaponAttack;
  };

  it("defaults iteratives to true when the key is absent", () => {
    assert.equal(migrate({}).iteratives, true);
  });
  it('parses iteratives = "false"', () => {
    assert.equal(migrate({ "weaponAttack.iteratives": "false" }).iteratives, false);
  });
  it('parses iteratives = "true"', () => {
    assert.equal(migrate({ "weaponAttack.iteratives": "true" }).iteratives, true);
  });
  it("treats a non-boolean iteratives value as true", () => {
    assert.equal(migrate({ "weaponAttack.iteratives": "maybe" }).iteratives, true);
  });
});
```

(Keep the existing `describe("chooseExtraAttacksType", …)` block unchanged.)

In `tests/technique-bonus-suppression.test.mjs`: change the import to drop `parseWeaponAttackConfig` (keep `applyTechniqueElementDamageToActionUse`, `applyTechniqueBonusSuppressions`), and replace the `describe("weaponAttack suppressed bonuses parsing", …)` block with:

```js
import { migrateLegacyWeaponAttack } from "../scripts/features/techniques/weapon-attack-migrate.mjs";

describe("weaponAttack suppressed bonuses migration", () => {
  it("splits the legacy csv into the two boolean fields", () => {
    const source = {
      flags: { dictionary: { "weaponAttack.mode": "selected", "weaponAttack.suppressedBonuses": "naturalAttack, abilityDamage" } },
    };
    migrateLegacyWeaponAttack(source);
    assert.equal(source.weaponAttack.suppressNaturalAttack, true);
    assert.equal(source.weaponAttack.suppressAbilityDamage, true);
  });
  it("ignores unknown suppression tokens", () => {
    const source = {
      flags: { dictionary: { "weaponAttack.mode": "selected", "weaponAttack.suppressedBonuses": "naturalAttack, bogus" } },
    };
    migrateLegacyWeaponAttack(source);
    assert.equal(source.weaponAttack.suppressNaturalAttack, true);
    assert.equal(source.weaponAttack.suppressAbilityDamage, false);
  });
});
```

(Leave the `technique bonus suppression`, `delegated technique element damage`, and `Amatsu no Karada source data` blocks unchanged — the Amatsu block still reads the un-rewritten JSON and passes until Task 9.)

- [ ] **Step 5: Run the affected tests, then the full suite**

Run: `node --test tests/helpers.test.mjs tests/weapon-attack-iteratives.test.mjs tests/technique-bonus-suppression.test.mjs`
Expected: PASS.
Run: `node --test tests/*.test.mjs`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add scripts/features/techniques/weapon-attack.mjs tests/helpers.test.mjs tests/weapon-attack-iteratives.test.mjs tests/technique-bonus-suppression.test.mjs
git commit -m "refactor(techniques): read weaponAttack from typed field, drop dict parser

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 6: Sheet + template — native form binding

**Files:**
- Modify: `scripts/features/techniques/sheet.mjs`
- Modify: `templates/item/technique-sheet.hbs`

**Interfaces:**
- Consumes: `buildWeaponAttackFormData`, `buildWeaponAttackSummary`, `extraAttacksArrayFromText`, `applyWeaponAttackPreset`, the `*_CHOICES` (Task 4).
- No new unit test (V1 `ItemSheet` is Foundry-bound). Verified by lint + the helper tests + manual QA in-world.

- [ ] **Step 1: Update `sheet.mjs` imports**

Change the import block from `./weapon-attack-sheet.mjs` to drop the removed names and add `extraAttacksArrayFromText`:

```js
import {
  applyWeaponAttackPreset,
  buildWeaponAttackFormData,
  buildWeaponAttackSummary,
  extraAttacksArrayFromText,
  WEAPON_ATTACK_DAMAGE_MODE_CHOICES,
  WEAPON_ATTACK_FILTER_CHOICES,
  WEAPON_ATTACK_HELD_CHOICES,
  WEAPON_ATTACK_PRESET_CHOICES,
} from "./weapon-attack-sheet.mjs";
```

- [ ] **Step 2: Replace the `_updateObject` weaponAttack block**

In `sheet.mjs#_updateObject`, **delete** the whole `const hasWeaponAttackFormData = …` block (the dict build, `-=` markers, `removeSyntheticWeaponAttackFormFields`). Keep the `empower.damageTypes` split. Add, before `return super._updateObject(...)`:

```js
if (typeof formData["weaponAttack-extraAttacksText"] === "string") {
  formData["system.weaponAttack.extraAttacks"] = extraAttacksArrayFromText(
    formData["weaponAttack-extraAttacksText"],
  );
  delete formData["weaponAttack-extraAttacksText"];
}
delete formData["weaponAttack-preset"];
```

- [ ] **Step 3: Simplify the preset handler + getData**

(a) **Delete** the `WEAPON_ATTACK_REQUIRED_FORM_KEYS` constant (top of file).

(b) In `getData`, the `context.weaponAttack = buildWeaponAttackFormData(item)` line stays as-is (now typed). Keep `context.weaponAttackSummary` and the `*Choices`. No change needed beyond the import.

(c) Rewrite `_onWeaponAttackPreset` to read the form's now-native inputs and the synthetic preset/textarea names. Replace the method body with:

```js
_onWeaponAttackPreset(event) {
  const preset = event.currentTarget.value;
  if (!preset || preset === "custom") return;

  const form = event.currentTarget.form;
  const get = (name) => form.elements.namedItem(name);
  const fields = [
    "system.weaponAttack.enabled", "system.weaponAttack.filter", "system.weaponAttack.damageMode",
    "system.weaponAttack.held", "system.weaponAttack.charge", "system.weaponAttack.iteratives",
    "system.weaponAttack.attackBonus", "system.weaponAttack.damageBonus",
    "system.weaponAttack.nonCritDamageBonus", "system.weaponAttack.suppressNaturalAttack",
    "system.weaponAttack.suppressAbilityDamage", "weaponAttack-extraAttacksText",
  ];
  if (fields.some((name) => !get(name))) return;

  const current = {
    enabled: get("system.weaponAttack.enabled").checked === true,
    preset,
    filter: get("system.weaponAttack.filter").value,
    damageMode: get("system.weaponAttack.damageMode").value,
    attackBonus: get("system.weaponAttack.attackBonus").value,
    damageBonus: get("system.weaponAttack.damageBonus").value,
    nonCritDamageBonus: get("system.weaponAttack.nonCritDamageBonus").value,
    extraAttacksText: get("weaponAttack-extraAttacksText").value,
    held: get("system.weaponAttack.held").value,
    charge: get("system.weaponAttack.charge").checked === true,
    iteratives: get("system.weaponAttack.iteratives").checked === true,
    suppressNaturalAttack: get("system.weaponAttack.suppressNaturalAttack").checked === true,
    suppressAbilityDamage: get("system.weaponAttack.suppressAbilityDamage").checked === true,
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
  get("weaponAttack-extraAttacksText").value = next.extraAttacksText ?? "";
  get("system.weaponAttack.suppressNaturalAttack").checked = next.suppressNaturalAttack === true;
  get("system.weaponAttack.suppressAbilityDamage").checked = next.suppressAbilityDamage === true;
}
```

(d) Update the listener selector (it currently targets `select[name='system.weaponAttack.preset']`): change to `select[name='weaponAttack-preset']`.

- [ ] **Step 4: Update the template**

In `templates/item/technique-sheet.hbs`:
- Change `<select name="system.weaponAttack.preset">` → `<select name="weaponAttack-preset">` (line ~609).
- Change `<textarea name="system.weaponAttack.extraAttacksText" …>` → `<textarea name="weaponAttack-extraAttacksText" …>` (line ~663).
- **Delete** the warnings block `{{#if weaponAttack.warnings.length}} … {{/if}}` (lines ~684-693).
- Leave all other `name="system.weaponAttack.*"` inputs and the two summary tags unchanged.

- [ ] **Step 5: Lint**

Run: `npm run lint:js`
Expected: PASS (no unused imports/vars — confirm `WEAPON_ATTACK_REQUIRED_FORM_KEYS` and removed imports are gone).

- [ ] **Step 6: Manual QA (in-world reload, no Docker restart)**

Reload the world (`F5`), open a technique sheet → Automation/weapon-attack section:
- Toggle `enabled`, change one field (e.g. `filter`), save/close, reopen → only that field changed; nothing reset. ✔
- Pick a preset → sibling fields update; save → values persist; reopen → preset shows "custom", fields retained. ✔
- Add two extra-attacks lines → save → reopen → textarea shows both lines. ✔
- Disable → save → reopen → all controls disabled-default; no leftover data. ✔

- [ ] **Step 7: Commit**

```bash
git add scripts/features/techniques/sheet.mjs templates/item/technique-sheet.hbs
git commit -m "refactor(techniques): bind weaponAttack sheet form to typed field

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 7: Synckit parity — migrate inside `normalizeSystem`

**Files:**
- Modify: `scripts/features/techniques/sync.mjs`
- Test: `tests/helpers.test.mjs`

**Interfaces:**
- Consumes: `migrateLegacyWeaponAttack` (Task 1), `applyTechniqueSystemDefaults` weaponAttack block (Task 3).

> `normalizeSystem` must RECONSTRUCT the typed config from any legacy dict keys (run the transform), not merely strip them — otherwise a not-yet-migrated actor's config (still in the dict) is lost and falsely diffs against the migrated source. The transform must run BEFORE defaults (defaults would otherwise set `enabled:false`, tripping the "already typed" guard).

- [ ] **Step 1: Write the failing test**

In `tests/helpers.test.mjs`, near the existing `diffTechnique` tests (~line 1635), add:

```js
it("treats a legacy-dictionary technique as up-to-date against its migrated source", () => {
  const legacyEmbedded = {
    flags: { dictionary: { "weaponAttack.mode": "selected", "weaponAttack.filter": "unarmedOnly" } },
  };
  const migratedSource = {
    weaponAttack: {
      enabled: true, filter: "unarmedOnly", damageMode: "add", held: "", charge: false,
      iteratives: true, attackBonus: "", damageBonus: "", nonCritDamageBonus: "",
      extraAttacks: [], suppressNaturalAttack: false, suppressAbilityDamage: false,
    },
  };
  assert.equal(diffTechnique(legacyEmbedded, migratedSource), true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/helpers.test.mjs`
Expected: FAIL — embedded side normalizes to disabled defaults (dict not reconstructed) ≠ enabled source.

- [ ] **Step 3: Write minimal implementation**

In `scripts/features/techniques/sync.mjs`:

(a) Add the import at the top:

```js
import { migrateLegacyWeaponAttack } from "./weapon-attack-migrate.mjs";
```

(b) Rewrite the start of `normalizeSystem` so the transform runs before defaults:

```js
export function normalizeSystem(system) {
  const cloned = foundry.utils.deepClone(system);
  migrateLegacyWeaponAttack(cloned);
  const out = applyTechniqueSystemDefaults(cloned, { collectionType: "array" });
  delete out.tag;
  // …rest unchanged…
```

(Remove the previous `applyTechniqueSystemDefaults(foundry.utils.deepClone(system), …)` call it replaces.)

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/helpers.test.mjs`
Expected: PASS (new assertion + existing diffTechnique tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/features/techniques/sync.mjs tests/helpers.test.mjs
git commit -m "fix(techniques): reconstruct typed weaponAttack in synckit normalizer

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 8: GM actor migration (version 3)

**Files:**
- Modify: `scripts/data/maintenance-migration.mjs`

**Interfaces:**
- Consumes: `migrateLegacyWeaponAttack`, `hasLegacyWeaponAttack` (Task 1).
- No new unit test (Foundry actor loop). Pure transform already covered by Task 1. Verified by lint + manual QA.

- [ ] **Step 1: Add imports + version bump**

In `scripts/data/maintenance-migration.mjs`:

(a) Add to the imports:

```js
import {
  hasLegacyWeaponAttack,
  migrateLegacyWeaponAttack,
} from "../features/techniques/weapon-attack-migrate.mjs";
```

(b) Bump `export const MAINTENANCE_MIGRATION_VERSION = 2;` → `3`.

- [ ] **Step 2: Add `migrateVersion3`**

Add this function (after `migrateVersion2`):

```js
async function migrateTechniqueWeaponAttack(item) {
  if (item.type !== TECHNIQUE_ITEM_TYPE) return;
  if (!hasLegacyWeaponAttack(item.system)) return;
  const data = item.toObject();
  migrateLegacyWeaponAttack(data.system);
  // Full system replace ({recursive:false}) drops the legacy dictionary keys
  // wholesale — avoids the dotted-key "-=" deletion landmine.
  await item.update({ system: data.system }, { diff: false, recursive: false });
}

async function migrateVersion3(actors) {
  for (const actor of actors.values()) {
    for (const item of actor.items) await migrateTechniqueWeaponAttack(item);
  }
  for (const item of game.items) await migrateTechniqueWeaponAttack(item);
}
```

- [ ] **Step 3: Wire it into `runMaintenanceMigrations`**

After the `if (completed < 2) { … }` block, add:

```js
if (completed < 3) {
  await migrateVersion3(actors);
  completed = 3;
  await game.settings.set(MODULE_ID, MAINTENANCE_MIGRATION_SETTING, completed);
}
```

- [ ] **Step 4: Lint + full suite**

Run: `npm run lint:js && node --test tests/*.test.mjs`
Expected: PASS.

- [ ] **Step 5: Manual QA**

With an actor that has a pre-migration technique (legacy dict data), reload as GM. After `ready`: open the technique sheet → weapon-attack config is intact; inspect `item.system.weaponAttack` (populated) and `item.system.flags.dictionary` (no weaponAttack keys). Synckit shows it up-to-date.

- [ ] **Step 6: Commit**

```bash
git add scripts/data/maintenance-migration.mjs
git commit -m "feat(techniques): migrate embedded weaponAttack data to typed field on ready

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 9: Compendium source rewrite + repack

**Files:**
- Create: `tools/migrate-weapon-attack.mjs`
- Modify: `packs/_source/techniques/*.json` (139 files, via the script)
- Modify: `packs/techniques/*` (rebuilt LevelDB, via `npm run pack`)
- Modify: `tests/technique-bonus-suppression.test.mjs`, `tests/technique-damage-transform.test.mjs` (JSON-format assertions)

**Interfaces:**
- Consumes: `migrateLegacyWeaponAttack` (Task 1).

- [ ] **Step 1: Write the migration script**

Create `tools/migrate-weapon-attack.mjs`:

```js
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import {
  hasLegacyWeaponAttack,
  migrateLegacyWeaponAttack,
} from "../scripts/features/techniques/weapon-attack-migrate.mjs";

const dir = "packs/_source/techniques";
let changed = 0;
for (const file of readdirSync(dir)) {
  if (!file.endsWith(".json")) continue;
  const path = join(dir, file);
  const doc = JSON.parse(readFileSync(path, "utf8"));
  if (!doc.system || !hasLegacyWeaponAttack(doc.system)) continue;
  migrateLegacyWeaponAttack(doc.system);
  writeFileSync(path, JSON.stringify(doc, null, 2) + "\n", "utf8");
  changed += 1;
}
console.log(`migrated ${changed} technique source files`);
```

> Match the existing source JSON formatting: 2-space indent + trailing newline (as `tools/add-sources.mjs` etc. produce). If `npm run lint:format`/git diff shows a formatting mismatch on untouched files, adjust the `JSON.stringify` args to match — only the changed files should differ.

- [ ] **Step 2: Run the script**

Run: `node tools/migrate-weapon-attack.mjs`
Expected: `migrated 139 technique source files`.

- [ ] **Step 3: Verify the rewrite**

Run: `grep -rl "weaponAttack\." packs/_source/techniques | head`
Expected: no output (no dotted dictionary keys remain).
Run: `grep -rl '"weaponAttack"' packs/_source/techniques | wc -l`
Expected: `139` (now under `system.weaponAttack`).
Spot-check one file: `python3 -c "import json; print(json.dumps(json.load(open('packs/_source/techniques/TAIJUTSU__JUUROKU_RENDAN__HAND_TO_HAND__SIXTEEN_HIT_COMBO__SRbVxeFEgnKX1MFI.json'))['system']['weaponAttack'], indent=2))"`
Expected: typed object with `enabled:true, filter:"unarmedOnly", damageMode:"replace", iteratives:false, extraAttacks:[…]`, and `system.flags.dictionary` has no weaponAttack keys.

- [ ] **Step 4: Update the two JSON-format tests**

In `tests/technique-bonus-suppression.test.mjs`, replace the `Amatsu no Karada source data` assertions:

```js
const amatsu = JSON.parse(readFileSync("packs/_source/techniques/AMATSU_NO_KARADA__HEAVENLY_BODY__Eg83TQOvnreI9eeo.json", "utf8"));
const wa = amatsu.system.weaponAttack;
const action = amatsu.system.actions[0];

assert.equal(wa.enabled, true);
assert.equal(wa.filter, "unarmedOnly");
assert.equal(wa.damageMode, "replace");
assert.equal(wa.suppressNaturalAttack, true);
assert.equal(wa.suppressAbilityDamage, true);
assert.equal(action.ability.attack, "dex");
assert.equal(action.ability.damage, "");
```

In `tests/technique-damage-transform.test.mjs`, replace the Gatotsu Isshiki assertions:

```js
const gatotsu = JSON.parse(readFileSync("packs/_source/techniques/GATOTSU__ISSHIKI__PIERCING_FANG__FIRST_FORM__G7yk5aL2kP4b5Rqz.json", "utf8"));
const wa = gatotsu.system.weaponAttack;

assert.equal(wa.enabled, true);
assert.equal(wa.filter, "meleeWeapon");
assert.equal(wa.charge, true);
```

- [ ] **Step 5: Rebuild the pack + validate + test**

Run: `npm run pack`
Expected: pack rebuild completes without error.
Run: `npm run validate:compendia`
Expected: PASS.
Run: `node --test tests/*.test.mjs`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add tools/migrate-weapon-attack.mjs packs/_source/techniques packs/techniques tests/technique-bonus-suppression.test.mjs tests/technique-damage-transform.test.mjs
git commit -m "chore(techniques): migrate compendium weaponAttack to typed field + repack

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 10: Remove dead i18n keys + final verification

**Files:**
- Modify: `lang/en.json`, `lang/pt-BR.json`

- [ ] **Step 1: Confirm the keys are unreferenced**

Run: `grep -rn "WeaponAttackIssues\|Notifications.WeaponAttackConfig\|WeaponAttack.Warnings" scripts templates`
Expected: no output (all usage removed in Tasks 5 & 6).

- [ ] **Step 2: Remove the keys**

In both `lang/en.json` and `lang/pt-BR.json`:
- Delete the entire `"WeaponAttackIssues": { … }` object (en.json ~lines 114-122).
- Delete the `"WeaponAttackConfig": "…"` line inside `Notifications` (en.json ~line 576; pt-BR ~line 580).
- Delete the `"Warnings": { … }` object inside `WeaponAttack` (~line 475) — confirm with `grep -n "Warnings" lang/en.json` first; remove only the `WeaponAttack.Warnings` group.
- Fix any now-dangling trailing comma so the JSON stays valid.

- [ ] **Step 3: Validate JSON + format + full lint + tests**

Run: `node -e "JSON.parse(require('fs').readFileSync('lang/en.json')); JSON.parse(require('fs').readFileSync('lang/pt-BR.json')); console.log('valid')"`
Expected: `valid`.
Run: `npm run lint`
Expected: PASS (`lint:format` checks `lang/**/*.json`).
Run: `npm test`
Expected: PASS.

- [ ] **Step 4: Final whole-feature verification**

Run: `npm run lint && npm test && npm run validate:compendia`
Expected: all PASS.
Run: `grep -rn "readWeaponAttackRaw\|parseWeaponAttackConfig\|buildWeaponAttackDictionaryUpdates\|weaponAttackFormDataFromForm\|flags.dictionary.*weaponAttack" scripts`
Expected: no output (no stragglers).

- [ ] **Step 5: Commit**

```bash
git add lang/en.json lang/pt-BR.json
git commit -m "chore(i18n): remove dead weaponAttack validation strings

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Self-review notes

- **Spec coverage:** schema (T2), migrateData vector-1 (T1+T2), compendium vector-2 (T9), ready vector-3 (T8), runtime read + warnings deletion (T5), sheet/template (T6), sheet helpers (T4), defaults+parity (T3), synckit (T7 — refined from "strip" to "reconstruct"), i18n (T10), all test updates (T4/T5/T9). Acceptance criteria 1-7 all map to tasks.
- **Refinement over spec:** `normalizeSystem` runs `migrateLegacyWeaponAttack` (reconstruct + strip) before defaults, instead of only stripping dict keys — required for correct synckit parity on not-yet-migrated actors.
- **Ordering invariant:** every task ends green. Task 4 stops the sheet importing the soon-deleted parser before Task 5 deletes it; the Amatsu/Gatotsu JSON-format tests stay valid until Task 9 rewrites the JSON.
- **Type consistency:** typed `weaponAttack` sub-field names are identical across schema (T2), defaults (T3), migrate (T1), runtime read (T5), sheet form-data (T4), and migration (T8).
