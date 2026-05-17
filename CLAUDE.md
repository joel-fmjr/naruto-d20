# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this module does

Foundry VTT module for a Naruto D20 homebrew expansion on top of Pathfinder 1e (PF1e). It adds:
- A custom `Technique` item type with its own sheet and data model
- Chakra Pool and Chakra Reserve resources tracked in actor flags
- 5 Naruto discipline "learn check" skills (ckc, gnj, nin, tai, fui) injected into PF1e's skill system
- A Chakra tab on the actor sheet, and Hero Statistics injected into the Summary tab
- 4 elemental damage types (Earth, Water, Wind, Holy)
- Buff targets for chakra resources and learn checks that plug into PF1e's changes engine

## Development cycle

No build step. Files are ESM loaded directly by Foundry VTT.

Foundry runs in Docker (`/home/ezioaalves/Documents/foundry/docker-compose.yml`) with `./foundrydata` bind-mounted — **do not restart Docker to pick up changes**. The container already reads files from your local disk.

1. Edit source files.
2. Reload in the browser: `F5` for a full page reload, or `Ctrl+R` in-world for a lighter module-only reload that re-fires all module hooks without reloading the whole page.

## PF1e version pinning — IMPORTANT

The installed system is **PF1e v11.11** at `/systems/pf1/`. There is also a
**`pf1-source/` filesystem mirror** symlinked as `pf1/` — that mirror is the
**dev branch** and uses API paths that don't exist in v11.11. Mixing them
ships broken code.

| Source | What it is | Trust for v11.11 |
|---|---|---|
| `/systems/pf1/pf1.js` + `lang/en.json` (installed system) | The bundle Foundry actually loads. | ✅ Ground truth. |
| context7 `/websites/foundryvtt_pathfinder1e_gitlab_io_foundryvtt-pathfinder1` | TypeDoc-generated API reference from the published docs site. Matches v11.11 class names (`pf1.components.ItemChange`, etc.). | ✅ Primary API reference. |
| context7 `/gitlab_foundryvtt_pathfinder1e/foundryvtt-pathfinder1` | Help pages + curated llms.txt from the master (stable) branch. | ✅ Complementary — usage patterns / cookbook. |
| `pf1/` → `../pf1-source/` (filesystem symlink) | **Dev branch source.** Used for editor autocomplete only. | ❌ Do NOT treat as API spec. Paths like `pf1.models.components.Change` only exist here. |

**Before referencing any `pf1.*` global, `CONFIG.PF1.*` key, `system.*` field,
or `"PF1.*"` i18n key, invoke the `pf1e-api-check` skill (`.claude/skills/`)
to verify it exists in v11.11.** Or delegate to the `pf1e-api-verifier`
subagent (`.claude/agents/`) for batch verification.

Known divergences are documented in the skill file. A few to keep in mind:
- `pf1.components.ItemChange` (NOT `pf1.models.components.Change` — that's the dev-only path)
- `system.changes` is an `ArrayField` in v11.11, not a `TypedObjectField` record
- i18n keys are mostly flat in v11.11 (e.g. `PF1.Changes`, not `PF1.Changes.many`)
- Actor sheet classes are `pf1.applications.ActorSheetPFCharacter` etc., not `pf1.applications.actor.CharacterSheetPF`

## Context7 docs

Library IDs (all v11.11-aligned unless noted):
- `foundryvtt_api_v13` — Foundry core API
- `foundryvtt_pathfinder1e_gitlab_io_foundryvtt-pathfinder1` — PF1e API class reference (primary)
- `gitlab_foundryvtt_pathfinder1e/foundryvtt-pathfinder1` — PF1e help guides & cookbook

## Hook lifecycle (execution order)

The numbered comments in `scripts/main.mjs` are authoritative. The sequence matters because PF1e's data pipeline has hard dependencies:

| Hook | What we do |
|------|-----------|
| `init` [1] | Register `TechniqueDataModel` into `CONFIG.Item.dataModels`, register `TechniqueItemSheet` |
| `pf1PostInit` [2] | Register buff targets in `CONFIG.PF1` (not available before this), register Naruto skill labels |
| `pf1PrepareBaseActorData` [3] | Init flag schema on actor, reset computed fields to 0 so the changes engine writes onto a clean slate; seed skill entries |
| `pf1GetChangeFlat` [4] | Map buff target keys (`chakraPool`, `learnCkc`, …) to their flag paths so the changes engine knows where to write |
| `pf1PrepareDerivedActorData` [5] | Compute all totals (chakra max, learn check totals, elemental resistance) after the changes engine has committed buff values |
| `pf1RegisterDamageTypes` [6] | Register Earth/Water/Wind/Holy elemental damage types |
| `setup` [7] | Push Chakra tab into PF1e sheet `TABS`, install the `_renderInner` patch, register roll listeners |
| `preCreateActor` [8] | Seed default flag values (`actionPoints`, `reputation`, `wealth`) on new actors |
| `ready` [9] | GM-only one-time migration to backfill missing flags on existing actors |

## Architecture

### Data storage

All module data lives exclusively in actor flags under `flags["naruto-d20"].*`. Never in core document fields (`system.*`), except for `TechniqueDataModel` fields which live in `item.system.*` (Foundry's TypeDataModel mechanism).

Flag schema (on `character` and `npc` actors):
```
flags["naruto-d20"].chakra.pool.{value, max, maxBonus}
flags["naruto-d20"].chakra.reserve.{value, max, maxBonus}
flags["naruto-d20"].chakra.nature.{primary, secondary[]}
flags["naruto-d20"].learn.{ckc,gnj,nin,tai,fui}.{base, abilityMod, buffBonus, miscBonus, total, conditional}
flags["naruto-d20"].{actionPoints, reputation, wealth}
```

`maxBonus` and `buffBonus` fields are the write targets for PF1e's changes engine (mapped via `pf1GetChangeFlat`). They are reset to 0 in `prepareBaseActorData` and written by the engine, then read in `prepareDerivedActorData`.

### Technique item (`TechniqueDataModel`)

Defined in `scripts/data/technique-model.mjs`. Extends `foundry.abstract.TypeDataModel`. All stored fields are in `item.system.*`. Derived stats (`learnDC`, `performDC`, `successes`, `skillThreshold`) are computed via the `derived` getter from `rank + complexity` — never stored.

The item sheet (`TechniqueItemSheet`) extends Foundry's base `ItemSheet` directly, **not** `pf1.applications.item.ItemSheetPF`, because PF1e's sheet calls `item.getLabels()` which requires PF1e's full action machinery that technique items don't have.

### Chakra tab UI injection

The tab is injected by patching `ActorSheetPF.prototype._renderInner` (in `scripts/ui/chakra-tab.mjs`). This is intentional: if the nav `<a>` is injected via the later `renderActorSheetPF` hook, Foundry's V1 Tabs system has already bound and activated tabs, causing it to fall back to the Summary tab and corrupt `_tabs[0].active`. The patch runs before `_activateCoreListeners`, guaranteeing the chakra tab is present when tabs are bound.

Roll listeners (`.shinobi-roll`) and tooltip listeners (`[data-naruto-tooltip]`) are still wired in `renderActorSheetPF` since they depend on live DOM.

**Learn check rolls** use `pf1.dice.d20Roll()` (not a bare `Roll`) so the native PF1e skill check dialog appears (situational bonus, DC, roll mode, Take 10/20). Parts are labeled strings — `"5[Character Level]"`, `"3[Wis]"`, `"2[Iron Will Buff]"` — which produce the PF1e-style chat card breakdown. Buff source names come from `actor.sourceInfo[flagPath].positive`, falling back to a generic `"Buff Bonus"` label if sourceInfo has no entries for that path.

**Learn check tooltips** use `data-naruto-tooltip="learn.<key>"` (not `data-tooltip`) to avoid colliding with PF1e's own tooltip handler. On `pointerenter`, they render `systems/pf1/templates/extended-tooltip.hbs` via `game.tooltip.activate()`.

### Summary tab injection (`summary-stats.mjs`)

Rendered via `renderActorSheetPF`. Inserts the `#naruto-hero-statistics` block before PF1e's quick-actions section (or prepends to `.tab.summary` as a fallback).

### Skills

`registerNarutoSkills()` writes labels into `pf1.config.skills` during `pf1PostInit`. `ensureActorSkillEntries()` seeds `actor.system.skills[key]` with `{ ability, rank: 0 }` during `pf1PrepareBaseActorData` using `??=` so existing ranks are never overwritten. The governing ability per discipline can be changed on the PF1e Skills tab and is read back via `actor.system.skills[key].ability`.

## Key references

- [Foundry API Docs](https://foundryvtt.com/api/)
- [PF1e API Docs](https://foundryvtt_pathfinder1e.gitlab.io/foundryvtt-pathfinder1/)
