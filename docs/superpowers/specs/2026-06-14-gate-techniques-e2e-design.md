# E2E tests for the Eight-Gates techniques — design

**Date:** 2026-06-14
**Branch:** `feat/e2e-automated-qa`

## Goal

Add Playwright E2E coverage for the three updated Eight-Gates (Hachimon Tonkou)
techniques to the automated QA suite:

- **KAI-MON KAI (INITIAL GATE RELEASE)** — forced HP upkeep, `2`/round.
- **KYU-MON KAI (HEAL GATE RELEASE)** — forced chakra-damage upkeep
  (`3 - floor(@mastery / 5)`), fast-healing (`2 + ceil(@mastery / 2)`), and
  clears `fatigued`/`exhausted` each turn.
- **SEI-MON KAI (LIFE GATE RELEASE)** — forced HP upkeep
  (`4 - floor(@mastery / 5)`); companion buff grants 8 temporary chakra.

The unit suite (`tests/helpers.test.mjs`) already covers these techniques'
formulas, facets, and source-data snapshots. The gap is the **runtime flow** in
a live world, which only the E2E suite can exercise:

```
perform (self-target, 0 chakra)
  → applyUpkeepBuff copies the companion buff onto the caster with a real
    round duration + duration-model maintenance flag
  → per-turn forced upkeep via the updateCombat hook
    (HP loss / chakra-damage + fast-healing + condition clearing)
  → expiry tears the buff down and sets `fatigued`
  → lethal guard tears down instead when upkeep would drop HP below 1
```

## What exists vs. what's missing

The per-turn upkeep is driven exclusively by Foundry's `updateCombat` hook
(`scripts/automation/turn-maintenance.mjs` → `runTurnUpkeep`). The current
`scripts/testing/test-api.mjs` has **no** way to create a combat or advance
turns, so this behaviour is currently untestable from the suite. The expiry
path is already reachable through the existing `expireActorEffects` helper.

## New test-API helpers (`scripts/testing/test-api.mjs`)

1. **`startCombatForActor(actor)`** — ensure the actor has a token on the active
   scene (reuse `createToken`), create a `Combat`, add the actor's combatant,
   activate it, and start it. Record the combat id (and any token created) in
   the active fixture for cleanup.

2. **`advanceCombatTurn(actor)`** — snapshot the ids of the actor's
   duration-model maintenance buffs, call `combat.nextRound()` (which fires
   `updateCombat`), then `waitFor` a settled state: every snapshotted buff has
   either advanced its `flags["naruto-d20"].maintenanceBuff.lastUpkeepRound` to
   the new round **or** been deleted (teardown). This deterministically settles
   the deferred `setTimeout(0)` upkeep work.

3. **Cleanup** — `endTestFixture` deletes any fixture-created combat (added to
   the existing teardown attempt list), so the world is left untouched.

Both helpers are exported on the `mod.api` object alongside the existing ones.

## New spec: `tests/e2e/specs/gate-techniques.spec.mjs`

Follows the `auto-buffs.spec.mjs` pattern: a shared `prepareGate(page, name)`
helper that `ensureTechnique`s the gate from `naruto-d20.techniques`, sets
`learning.learned = true`, a `mastery` high enough to bypass the perform roll,
`automation.enabled = true`, turns `automaticBuffs` on and `buffTargetFiltering`
to `respectTechnique`, then `resetActor` + `clearAutomationBuffs`.

### Test cases

**KAI-MON KAI (forced HP 2/round)**
1. Perform applies exactly one self-buff: active, finite round `system.duration`,
   duration-model maintenance flag present.
2. After one combat turn, current HP drops by exactly 2; the buff is still
   active; `fatigued` is not yet set.
3. Lethal guard — set HP to 2, advance one turn → `hp - 2 < 1` → the buff is
   torn down (removed) and `fatigued` is set.

**KYU-MON KAI (chakra-damage cost + fast-healing + clear conditions)**
4. Pre-set `fatigued` + `exhausted`, HP below max, and ample pool chakra.
   Perform, then advance one turn → pool reduced by the upkeep cost (3 at
   mastery 0), HP healed by fast-healing (2 at mastery 0, capped at max),
   `fatigued` + `exhausted` cleared, and `system.traits.fastHealing` stamped.

**SEI-MON KAI (forced HP 4 - floor(mastery/5) + temp chakra)**
5. Perform applies the self-buff **and** grants 8 temporary chakra (companion
   buff change).
6. After one combat turn, current HP drops by 4 (mastery 0); the buff is active.

**Shared expiry**
7. Perform a gate, then `expireActorEffects(actor)` → the buff is deleted and
   `fatigued` is set.

## Out of scope

- Mastery-scaled cost variants beyond one representative case (covered by
  `helpers.test.mjs`).
- Kyu-Mon chakra-damage overflow into HP (tests provide ample pool chakra).
- The non-forced upkeep prompt path — all three gates are `policy: "forced"`.

## Risks / things to verify during implementation

- `actor.activeOwner?.isSelf` must be true for the GM-driven fixture actor so
  `runTurnUpkeep` runs; verify at runtime.
- Whether `combat.nextRound()` alone triggers the upkeep tick (vs. needing
  `nextTurn`); the `updateCombat` hook listens for either `round` or `turn`
  changing.
