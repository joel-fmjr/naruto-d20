# Technique Weapon Automation UI Design

**Date:** 2026-06-27

## Problem

Many technique JSON files now carry behavior-specific automation in
`system.flags.dictionary.weaponAttack.*`, but the technique sheet exposes those values only through
the generic PF1e dictionary flag editor. That makes common in-world technique authoring difficult:
a user cannot easily create a technique like `Raite no Jutsu`, `Jiki-Uchi`, `Ryuutsuki`, or
`Juuroku Rendan` without knowing internal flag names and encodings.

The runtime behavior already supports selected actor attacks, damage replacement/addition, charge
uses, extra attacks, no-iterative combos, held-mode overrides, and bonus suppressions. The missing
piece is an explicit, user-facing editor.

## Goals

- Expose `weaponAttack` configuration on the technique sheet without requiring manual flag edits.
- Keep one `weaponAttack` configuration per technique, not per action.
- Preserve existing compendium JSON compatibility.
- Keep PF1e `ItemAction` data responsible for action details such as damage, save, range, target,
  notes, and damage ability.
- Provide quick presets for common patterns while keeping all supported fields editable.
- Make active weapon automation visible from the action list without moving the editor there.

## Non-Goals

- Do not customize or fork PF1e's native action sheet.
- Do not move `weaponAttack` into a new schema path such as `system.automation.weaponAttack`.
- Do not implement a rich row-based extra-attack builder in the first pass.
- Do not add new runtime weapon-attack behavior beyond exposing already supported fields.

## Architecture

The source of truth remains one technique-level config under
`system.flags.dictionary.weaponAttack.*`.

The technique and action responsibilities stay separate:

- The technique decides how it uses an actor's selected attack.
- The PF1e action decides what the technique contributes: damage, save, range, target, effect
  notes, and ability damage data.
- The `weaponAttack` config bridges those two pieces during use.

Runtime should continue to flow through the existing helpers:

- `getTechniqueWeaponAttackConfig(item)` reads and validates the config.
- `rollSelectedWeaponAttackWithTechnique(...)` performs the selected actor attack and applies the
  technique action details.

The sheet may reuse exported parsing/reading helpers from
`scripts/features/techniques/weapon-attack.mjs` to avoid duplicating supported values and warning
behavior.

## UI Placement

The main editor belongs in the technique sheet's `Automation` tab. This matches the config's
meaning: it controls the technique's automated use flow, not an individual action's native PF1e
data.

The `Details` tab should only show a compact summary when weapon automation is active, for example:

`Selected Unarmed · Replace damage · 3 attacks · no iteratives`

No editing controls are required in `Details` for the first implementation pass.

## Automation Tab Layout

Add a `Weapon Attack Automation` section.

Basic controls:

- `Use selected actor attack` checkbox.
- `Quick model` preset dropdown.
- `Attack filter` select.
- `Damage mode` select.
- `Charge` checkbox.
- `Held as` select.

Modifier controls:

- `Attack bonus` text input.
- `Damage bonus` text input.
- `Non-critical damage bonus` text input.

Combo controls:

- `Extra attacks` textarea.
- `Use BAB iteratives` checkbox.

Rare or safety controls:

- `Suppress natural attack bonuses` checkbox.
- `Suppress selected attack ability damage` checkbox.

The UI should group common fields before advanced fields so normal techniques do not require users
to understand every low-level option.

## Presets

Use a hybrid design: presets are shortcuts, but the resulting fields remain explicit and editable.

Initial presets:

- `Custom`: no automatic field changes.
- `Raite-like`: selected unarmed attack with replacement damage.
- `Jiki-Uchi-like`: selected melee-or-unarmed attack with additive attack and damage bonuses.
- `Ryuutsuki-like`: selected melee-or-unarmed attack with charge enabled.
- `Fixed combo`: selected attack with extra attacks and iteratives disabled.

Preset selection should fill the editable fields. Runtime should not depend on the preset name, and
the first implementation should not persist the preset value. After a preset is applied, the saved
data is only the explicit `weaponAttack.*` fields.

## Supported Field Mapping

When enabled, save:

- `weaponAttack.mode = "selected"`
- `weaponAttack.filter`
- `weaponAttack.damageMode`
- `weaponAttack.attackBonus`
- `weaponAttack.damageBonus`
- `weaponAttack.nonCritDamageBonus`
- `weaponAttack.extraAttacks`
- `weaponAttack.held`
- `weaponAttack.charge`
- `weaponAttack.iteratives`
- `weaponAttack.suppressedBonuses`

When disabled, remove the `weaponAttack.*` keys controlled by this UI while preserving unrelated
dictionary flags.

For consistency with current source JSON files, the sheet should write dotted dictionary keys such
as `weaponAttack.mode`, not a nested `weaponAttack` object.

## Normalization

Boolean fields should save as strings, matching current source JSON:

- checked `charge` -> `"true"`
- unchecked `charge` -> remove `weaponAttack.charge`
- checked `Use BAB iteratives` -> remove `weaponAttack.iteratives` because runtime defaults to true
- unchecked `Use BAB iteratives` -> `"false"`

Formula fields remain plain strings. The UI should not deeply validate PF1e formulas because
existing valid data uses expressions such as `@cl`, `min(...)`, labels, and arithmetic.

`Extra attacks` should be editable as one attack per line:

```text
0|Second Attack
0|Third Attack
```

On save, normalize to the existing internal format:

```text
0|Second Attack;0|Third Attack
```

The UI may also accept pasted semicolon-separated input and normalize it.

`suppressedBonuses` should continue to save as a comma-separated list using the currently supported
tokens:

- `naturalAttack`
- `abilityDamage`

## Validation And Errors

The sheet should prevent invalid values where a select or checkbox can guarantee valid data:

- `filter`: known filters only.
- `damageMode`: `add` or `replace`.
- boolean fields: generated from checkboxes.
- suppressions: generated from checkboxes.

For inherited or manually edited invalid config, the runtime parser remains the final guard. The UI
may surface parser warnings near the section, but it should not block saving just because a formula
string is unusual.

## Data Flow

Render flow:

1. `sheet.getData()` reads current `system.flags.dictionary`.
2. It derives `weaponAttackFields` for template consumption.
3. It derives a compact summary for the `Details` action list.
4. The template renders the Automation section and the Details badge.

Save flow:

1. `_updateObject()` receives the form data.
2. It converts user-friendly fields into `system.flags.dictionary.weaponAttack.*`.
3. It removes stale `weaponAttack.*` keys when the automation is disabled.
4. It preserves unrelated dictionary flags.
5. It delegates the final update to the normal item sheet flow.

## Manual Verification

Verify in Foundry VTT 13 with PF1e v11.11+:

- A `Raite-like` technique opens the unarmed selector and replaces selected attack damage with the
  technique action damage.
- A `Jiki-Uchi-like` technique opens the melee-or-unarmed selector and adds configured attack and
  damage bonuses.
- A `Ryuutsuki-like` technique sets the PF1e charge option during use.
- A `Juuroku Rendan` style technique rolls selected unarmed damage replacement with fixed extra
  attacks and `iteratives: false`.
- A technique with weapon automation disabled uses the normal technique action flow.
- Unrelated `system.flags.dictionary` entries survive save operations.
- Existing compendium techniques with dotted `weaponAttack.*` flags render correctly in the new UI.

## Open Implementation Notes

- Use the existing runtime parser wherever practical to avoid divergent supported-value lists.
- Add localization keys in both English and Portuguese.
- Keep the first extra-attacks UI as a textarea; a row editor can be added later if the textarea
  proves confusing in real use.
- Consider adding `.superpowers/` to `.gitignore` separately because the visual companion stores
  local brainstorming artifacts there.
