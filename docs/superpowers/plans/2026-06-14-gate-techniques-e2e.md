# Gate-Techniques E2E Tests Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Playwright E2E coverage for the three updated Eight-Gates techniques (Kai-Mon, Kyu-Mon, Sei-Mon) exercising the perform → self-buff → per-turn forced upkeep → teardown/expiry flow in a live Foundry world.

**Architecture:** A new spec `tests/e2e/specs/gate-techniques.spec.mjs` drives the rules through `page.evaluate` against the in-browser test API (same pattern as `auto-buffs.spec.mjs`). The per-turn upkeep is driven only by Foundry's `updateCombat` hook, so we add two combat-driving helpers to `scripts/testing/test-api.mjs` (`startCombatForActor`, `advanceCombatTurn`) plus combat cleanup in `endTestFixture`.

**Tech Stack:** Playwright, Foundry VTT v13 + PF1e v11.11, ESM, the module's own `test-api.mjs`.

---

## Background facts (verified, do not re-derive)

- The three gate techniques live in `naruto-d20.techniques`. Exact names:
  - `"KAI-MON KAI (INITIAL GATE RELEASE)"` — `maintenance.resource: "hp"`, `cost: "2"`, `policy: "forced"`.
  - `"KYU-MON KAI (HEAL GATE RELEASE)"` — `resource: "chakraDamage"`, `cost: "3 - floor(@mastery / 5)"`, `heal: "2 + ceil(@mastery / 2)"`, `clearConditions: "fatigued,exhausted"`, `policy: "forced"`.
  - `"SEI-MON KAI (LIFE GATE RELEASE)"` — `resource: "hp"`, `cost: "4 - floor(@mastery / 5)"`, `policy: "forced"`. Its companion buff in `naruto-d20.technique-buffs` carries a `temporaryChakra` change of `8`.
- All three have `automation.targetMode: "self"`, `automation.enabled: true`, `chakraCost: 0`, and a `"Use"` action with `duration { units: "round", value: "@cl" }` (resolves to the actor's character level).
- At **mastery 0**: Kai-Mon HP cost = 2, Sei-Mon HP cost = 4, Kyu-Mon chakra-damage = 3 and fast-healing = 2. The spec keeps mastery 0 and forces perform success with `{ forceRoll: 20, rollBonus: 100 }` so all formulas stay at these baseline values.
- On perform, `applyTechniqueBuff` → `applyUpkeepBuff` copies the same-named companion buff onto the caster, stamping `flags["naruto-d20"].maintenanceBuff = { model: "duration", totalRounds, startRound, interval, lastUpkeepRound }` and `system.duration { units: "round", value: <character level>, end: "turnStart" }`. For Sei-Mon, `createBuffOnTarget` also writes `+8` to `flags["naruto-d20"].chakra.pool.temp`.
- **Starting combat fires the first upkeep tick.** `combat.startCombat()` changes the round 0→1, firing `updateCombat` → `runTurnUpkeep` → the buff is charged once. Therefore `startCombatForActor` waits for that first tick to settle, and per-turn delta assertions take their baseline **after** `startCombatForActor` and measure across a single `advanceCombatTurn`.
- Per-turn upkeep is deferred via `setTimeout(0)`; the helpers wait until each duration-model buff has either advanced its `maintenanceBuff.lastUpkeepRound` to the new round or been deleted (teardown).
- Expiry is reachable without combat via the existing `expireActorEffects(actor)` helper: it deactivates the buff with `options.pf1.reason === "duration"`, firing the `updateItem` hook → `tearDownDurationBuff` → buff deleted + `fatigued` set.

## File structure

- **Modify** `scripts/testing/test-api.mjs` — add `combatIds` to the fixture record, `startCombatForActor`, `advanceCombatTurn`, an internal `waitForUpkeepSettle`, `deleteFixtureCombats` (wired into `endTestFixture`), and export the two new public helpers in `installTestApi`.
- **Create** `tests/e2e/specs/gate-techniques.spec.mjs` — the new spec.
- **Modify** `docs/automated-qa.md` — add a coverage row for the new spec.

---

## Task 1: Spec scaffold + Kai-Mon perform/buff test

**Files:**
- Create: `tests/e2e/specs/gate-techniques.spec.mjs`

This first test exercises only existing API (`ensureTechnique`, `performByName`, `listBuffs`), so it passes without the new helpers.

- [ ] **Step 1: Write the spec scaffold with the first test**

Create `tests/e2e/specs/gate-techniques.spec.mjs`:

```javascript
import { test, expect } from "../fixtures.mjs";

const KAI = "KAI-MON KAI (INITIAL GATE RELEASE)";
const KYU = "KYU-MON KAI (HEAL GATE RELEASE)";
const SEI = "SEI-MON KAI (LIFE GATE RELEASE)";

/**
 * Add a gate technique to the disposable fixture clone, learned and ready to
 * perform. Mastery stays 0 so the upkeep formulas keep their baseline values;
 * perform success is forced at call sites with { forceRoll: 20, rollBonus: 100 }.
 */
async function prepareGate(page, name) {
  return page.evaluate(async (techniqueName) => {
    const api = game.modules.get("naruto-d20").api;
    const actor = api.getActor();
    const item = await api.ensureTechnique(actor, techniqueName, {
      update: {
        "system.learning.learned": true,
        "system.mastery": 0,
        "system.automation.enabled": true,
        "system.automation.targetMode": "self",
      },
    });
    await api.setSetting("automaticBuffs", true);
    await api.setSetting("buffTargetFiltering", "respectTechnique");
    await api.setSetting("enforceLearning", true);
    await api.resetActor(actor, { pool: 20, reserve: 10, temp: 0 });
    await api.clearAutomationBuffs(actor);
    api.clearBuffLookupCache();
    return { id: item.id };
  }, name);
}

test.describe("Gate techniques — Kai-Mon Kai", () => {
  test("performing applies a self-buff with a finite round duration", async ({ page }) => {
    await prepareGate(page, KAI);
    const result = await page.evaluate(async (name) => {
      const api = game.modules.get("naruto-d20").api;
      const actor = api.getActor();
      const performed = await api.performByName(actor, name, { forceRoll: 20, rollBonus: 100 });
      const buffs = api.listBuffs(actor).filter((buff) => buff.sourceId);
      const doc = actor.items.get(buffs[0]?.id);
      return {
        warnings: performed.warnings,
        buffs,
        duration: doc?.system?.duration ?? null,
        model: doc?.flags?.["naruto-d20"]?.maintenanceBuff?.model ?? null,
      };
    }, KAI);

    expect(result.warnings).toEqual([]);
    expect(result.buffs).toHaveLength(1);
    expect(result.buffs[0].name).toBe(KAI);
    expect(result.buffs[0].active).toBe(true);
    expect(result.model).toBe("duration");
    expect(result.duration.units).toBe("round");
    expect(Number(result.duration.value)).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run the test to verify it passes**

Run: `npm run test:e2e -- gate-techniques.spec`
Expected: PASS (1 passed). Requires a running Foundry world with `FOUNDRY_USER`/`FOUNDRY_PASSWORD` set (see `docs/automated-qa.md`).

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/specs/gate-techniques.spec.mjs
git commit -m "test(e2e): cover Kai-Mon Kai perform applies duration buff"
```

---

## Task 2: Combat-driving helpers + Kai-Mon per-turn HP upkeep

**Files:**
- Modify: `scripts/testing/test-api.mjs`
- Modify: `tests/e2e/specs/gate-techniques.spec.mjs`

- [ ] **Step 1: Write the failing per-turn test**

Append inside the `"Gate techniques — Kai-Mon Kai"` describe block in `tests/e2e/specs/gate-techniques.spec.mjs` (before its closing `});`):

```javascript
  test("forced HP upkeep drains 2 HP per combat turn", async ({ page }) => {
    await prepareGate(page, KAI);
    const result = await page.evaluate(async (name) => {
      const api = game.modules.get("naruto-d20").api;
      const actor = api.getActor();
      await api.performByName(actor, name, { forceRoll: 20, rollBonus: 100 });
      await api.startCombatForActor(actor); // first upkeep tick happens here
      const hpBefore = actor.system.attributes.hp.value;
      await api.advanceCombatTurn(actor); // exactly one more tick
      return {
        hpBefore,
        hpAfter: actor.system.attributes.hp.value,
        buffs: api.listBuffs(actor).filter((buff) => buff.sourceId),
        fatigued: api.getConditions(actor).fatigued,
      };
    }, KAI);

    expect(result.hpAfter).toBe(result.hpBefore - 2);
    expect(result.buffs).toHaveLength(1);
    expect(result.buffs[0].active).toBe(true);
    expect(result.fatigued).toBe(false);
  });
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm run test:e2e -- gate-techniques.spec`
Expected: FAIL — `api.startCombatForActor is not a function` (page error).

- [ ] **Step 3: Add `combatIds` to the fixture record**

In `scripts/testing/test-api.mjs`, find the `activeFixture = { ... }` object literal inside `beginTestFixture` and add `combatIds: []` next to `packIds`:

```javascript
    tokenRefs: [],
    worldItemIds: [],
    packIds: [],
    combatIds: [],
    settingValues: new Map(),
```

- [ ] **Step 4: Add the combat helpers + settle waiter**

In `scripts/testing/test-api.mjs`, add these functions immediately after the existing `createToken` function:

```javascript
async function startCombatForActor(actor, { x = 100, y = 100 } = {}) {
  if (!activeFixture) throw new Error("No active E2E fixture");
  const scene = canvas.scene;
  if (!scene) throw new Error("An active scene is required for combat tests");

  let token = actor.getActiveTokens?.()[0]?.document ?? null;
  if (!token) token = await createToken(actor, { x, y });

  const ids = durationBuffIds(actor);
  const combat = await Combat.implementation.create({ scene: scene.id });
  activeFixture.combatIds.push(combat.id);
  await combat.createEmbeddedDocuments("Combatant", [
    { tokenId: token.id, sceneId: scene.id, actorId: actor.id },
  ]);
  await combat.activate();
  await combat.startCombat();
  await waitForUpkeepSettle(actor, ids, combat.round);
  return { combatId: combat.id, round: combat.round, turn: combat.turn };
}

async function advanceCombatTurn(actor) {
  const combat = game.combats.get(activeFixture?.combatIds.at(-1)) ?? game.combat;
  if (!combat) throw new Error("No active combat to advance");
  const ids = durationBuffIds(actor);
  await combat.nextRound();
  await waitForUpkeepSettle(actor, ids, combat.round);
  return { round: combat.round, turn: combat.turn };
}

function durationBuffIds(actor) {
  return actor.items
    .filter(
      (item) =>
        item.type === "buff" &&
        item.flags?.[MODULE_ID]?.maintenanceBuff?.model === "duration",
    )
    .map((item) => item.id);
}

async function waitForUpkeepSettle(actor, ids, round) {
  if (!ids.length) return;
  await waitFor(
    () =>
      ids.every((id) => {
        const item = actor.items.get(id);
        if (!item) return true; // torn down by lethal guard / expiry
        return Number(item.flags?.[MODULE_ID]?.maintenanceBuff?.lastUpkeepRound) === round;
      }),
    { label: `gate upkeep settle at round ${round}` },
  );
}
```

- [ ] **Step 5: Add combat cleanup to the fixture teardown**

In `scripts/testing/test-api.mjs`, add this function next to `deleteFixtureTokens`:

```javascript
async function deleteFixtureCombats() {
  if (!activeFixture) return;
  for (const id of activeFixture.combatIds) {
    const combat = game.combats.get(id);
    if (combat) await combat.delete();
  }
}
```

Then in `endTestFixture`, add an `attempt(deleteFixtureCombats)` call. Place it before `attempt(deleteFixtureTokens)` so combatants are removed before their tokens:

```javascript
    await attempt(restoreSettings);
    await attempt(deleteFixtureCombats);
    await attempt(deleteFixtureTokens);
    await attempt(deleteFixtureItemsAndPacks);
```

- [ ] **Step 6: Export the new helpers**

In `installTestApi`, add the two public helpers to the `mod.api` object (next to `createToken`):

```javascript
    createToken,
    startCombatForActor,
    advanceCombatTurn,
    setTargetByActor,
```

- [ ] **Step 7: Run the test to verify it passes**

Run: `npm run test:e2e -- gate-techniques.spec`
Expected: PASS (2 passed).

- [ ] **Step 8: Commit**

```bash
git add scripts/testing/test-api.mjs tests/e2e/specs/gate-techniques.spec.mjs
git commit -m "test(e2e): drive combat turns to assert Kai-Mon HP upkeep"
```

---

## Task 3: Kai-Mon lethal-guard teardown

**Files:**
- Modify: `tests/e2e/specs/gate-techniques.spec.mjs`

- [ ] **Step 1: Write the test**

Append inside the `"Gate techniques — Kai-Mon Kai"` describe block:

```javascript
  test("lethal upkeep tears the buff down and fatigues instead of dropping below 1 HP", async ({
    page,
  }) => {
    await prepareGate(page, KAI);
    const result = await page.evaluate(async (name) => {
      const api = game.modules.get("naruto-d20").api;
      const actor = api.getActor();
      await api.performByName(actor, name, { forceRoll: 20, rollBonus: 100 });
      await api.startCombatForActor(actor);
      await actor.update({ "system.attributes.hp.value": 2 }); // next 2-HP tick would hit 0
      await api.advanceCombatTurn(actor);
      return {
        hp: actor.system.attributes.hp.value,
        buffs: api.listBuffs(actor).filter((buff) => buff.sourceId),
        fatigued: api.getConditions(actor).fatigued,
      };
    }, KAI);

    expect(result.buffs).toHaveLength(0);
    expect(result.fatigued).toBe(true);
    expect(result.hp).toBe(2); // teardown skips the lethal subtraction
  });
```

- [ ] **Step 2: Run the test to verify it passes**

Run: `npm run test:e2e -- gate-techniques.spec`
Expected: PASS (3 passed).

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/specs/gate-techniques.spec.mjs
git commit -m "test(e2e): assert Kai-Mon lethal-guard teardown sets fatigued"
```

---

## Task 4: Kyu-Mon chakra-damage upkeep + fast-healing + condition clearing

**Files:**
- Modify: `tests/e2e/specs/gate-techniques.spec.mjs`

- [ ] **Step 1: Write the test**

Append a new describe block at the end of the file:

```javascript
test.describe("Gate techniques — Kyu-Mon Kai", () => {
  test("upkeep spends chakra, fast-heals, and clears fatigued/exhausted each turn", async ({
    page,
  }) => {
    await prepareGate(page, KYU);
    const result = await page.evaluate(async (name) => {
      const api = game.modules.get("naruto-d20").api;
      const actor = api.getActor();
      await api.performByName(actor, name, { forceRoll: 20, rollBonus: 100 });

      const hpMax = actor.system.attributes.hp.max;
      await actor.update({ "system.attributes.hp.value": hpMax - 10 });
      await api.setCondition(actor, "fatigued", true);
      await api.setCondition(actor, "exhausted", true);

      const poolBefore = api.getChakra(actor).pool.value;
      const hpBefore = actor.system.attributes.hp.value;
      await api.startCombatForActor(actor); // one upkeep tick
      const conditions = api.getConditions(actor);
      return {
        poolBefore,
        poolAfter: api.getChakra(actor).pool.value,
        hpBefore,
        hpAfter: actor.system.attributes.hp.value,
        fastHealing: actor.system.traits?.fastHealing ?? "",
        fatigued: conditions.fatigued,
        exhausted: conditions.exhausted,
      };
    }, KYU);

    expect(result.poolAfter).toBe(result.poolBefore - 3); // chakra-damage cost at mastery 0
    expect(result.hpAfter).toBe(result.hpBefore + 2); // fast-healing at mastery 0
    expect(String(result.fastHealing)).toBe("2");
    expect(result.fatigued).toBe(false);
    expect(result.exhausted).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it passes**

Run: `npm run test:e2e -- gate-techniques.spec`
Expected: PASS (4 passed).

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/specs/gate-techniques.spec.mjs
git commit -m "test(e2e): cover Kyu-Mon chakra-damage upkeep, heal, condition clear"
```

---

## Task 5: Sei-Mon temporary chakra grant + HP upkeep

**Files:**
- Modify: `tests/e2e/specs/gate-techniques.spec.mjs`

- [ ] **Step 1: Write the tests**

Append a new describe block at the end of the file:

```javascript
test.describe("Gate techniques — Sei-Mon Kai", () => {
  test("performing grants 8 temporary chakra alongside the self-buff", async ({ page }) => {
    await prepareGate(page, SEI);
    const result = await page.evaluate(async (name) => {
      const api = game.modules.get("naruto-d20").api;
      const actor = api.getActor();
      await api.performByName(actor, name, { forceRoll: 20, rollBonus: 100 });
      return {
        temp: api.getChakra(actor).pool.temp,
        buffs: api.listBuffs(actor).filter((buff) => buff.sourceId),
      };
    }, SEI);

    expect(result.buffs).toHaveLength(1);
    expect(result.buffs[0].name).toBe(SEI);
    expect(result.temp).toBe(8);
  });

  test("forced HP upkeep drains 4 HP per combat turn", async ({ page }) => {
    await prepareGate(page, SEI);
    const result = await page.evaluate(async (name) => {
      const api = game.modules.get("naruto-d20").api;
      const actor = api.getActor();
      await api.performByName(actor, name, { forceRoll: 20, rollBonus: 100 });
      await api.startCombatForActor(actor);
      const hpBefore = actor.system.attributes.hp.value;
      await api.advanceCombatTurn(actor);
      return {
        hpBefore,
        hpAfter: actor.system.attributes.hp.value,
        buffs: api.listBuffs(actor).filter((buff) => buff.sourceId),
      };
    }, SEI);

    expect(result.hpAfter).toBe(result.hpBefore - 4);
    expect(result.buffs).toHaveLength(1);
    expect(result.buffs[0].active).toBe(true);
  });
});
```

- [ ] **Step 2: Run the tests to verify they pass**

Run: `npm run test:e2e -- gate-techniques.spec`
Expected: PASS (6 passed).

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/specs/gate-techniques.spec.mjs
git commit -m "test(e2e): cover Sei-Mon temp chakra grant and HP upkeep"
```

---

## Task 6: Shared expiry → fatigued

**Files:**
- Modify: `tests/e2e/specs/gate-techniques.spec.mjs`

- [ ] **Step 1: Write the test**

Append a new describe block at the end of the file:

```javascript
test.describe("Gate techniques — expiry", () => {
  test("duration expiry deletes the gate buff and sets fatigued", async ({ page }) => {
    await prepareGate(page, KAI);
    const result = await page.evaluate(async (name) => {
      const api = game.modules.get("naruto-d20").api;
      const actor = api.getActor();
      await api.performByName(actor, name, { forceRoll: 20, rollBonus: 100 });
      const before = api.listBuffs(actor).filter((buff) => buff.sourceId);
      await api.expireActorEffects(actor);
      return {
        before,
        after: api.listBuffs(actor).filter((buff) => buff.sourceId),
        fatigued: api.getConditions(actor).fatigued,
      };
    }, KAI);

    expect(result.before).toHaveLength(1);
    expect(result.after).toHaveLength(0);
    expect(result.fatigued).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it passes**

Run: `npm run test:e2e -- gate-techniques.spec`
Expected: PASS (7 passed).

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/specs/gate-techniques.spec.mjs
git commit -m "test(e2e): assert gate duration expiry deletes buff and fatigues"
```

---

## Task 7: Lint, full suite run, and doc update

**Files:**
- Modify: `docs/automated-qa.md`

- [ ] **Step 1: Add the coverage row**

In `docs/automated-qa.md`, in the "Current coverage" table (after the `auto-buffs.spec.mjs` row at line ~58), add:

```markdown
| `gate-techniques.spec.mjs` | Eight-Gates upkeep: HP/chakra-damage drain, fast-healing, condition clearing, lethal guard, expiry |
```

- [ ] **Step 2: Lint the JS and formatting**

Run: `npm run lint:js && npm run lint:format`
Expected: no errors. If `lint:format` reports the spec or doc, run `npm run lint:fix` and re-check.

- [ ] **Step 3: Run the full E2E suite to confirm no regressions**

Run: `npm run test:e2e`
Expected: all specs pass, including the 7 new gate tests.

- [ ] **Step 4: Commit**

```bash
git add docs/automated-qa.md tests/e2e/specs/gate-techniques.spec.mjs scripts/testing/test-api.mjs
git commit -m "docs(e2e): list gate-techniques spec in automated-qa coverage"
```

---

## Self-review notes

- **Spec coverage:** Kai-Mon (apply, per-turn HP, lethal guard), Kyu-Mon (chakra-damage + heal + clear conditions), Sei-Mon (temp chakra grant, per-turn HP), shared expiry → fatigued. All seven design test cases map to Tasks 1–6. Combat-driving helper requirement → Task 2. Doc update → Task 7.
- **Out of scope (per design):** mastery-scaled cost variants, Kyu-Mon HP overflow, non-forced prompt path. Intentionally omitted.
- **Type/name consistency:** `startCombatForActor`, `advanceCombatTurn`, `durationBuffIds`, `waitForUpkeepSettle`, `deleteFixtureCombats`, `combatIds` are used consistently across Task 2's steps and later tasks. Flag path `flags["naruto-d20"].maintenanceBuff.{model,lastUpkeepRound}` matches `maintenance-buffs.mjs`.
- **Runtime risk to watch (from design):** if `actor.activeOwner?.isSelf` is false for the GM-driven clone, `runTurnUpkeep` will not run and the waiter will time out — if that happens, set the fixture user as the token/actor's owner before starting combat. If `startCombat()` does not fire the tick, fold a `combat.nextTurn()` into `startCombatForActor` before the settle wait.
