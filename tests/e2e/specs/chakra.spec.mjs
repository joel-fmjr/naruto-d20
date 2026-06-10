import { test, expect } from "../fixtures.mjs";

/**
 * manual-qa.md → "Chakra" (passos 1–6).
 *
 * Driven through the test API: we read derived maxes and the condition state
 * straight from actor flags / actor.statuses rather than scraping the sheet.
 * One DOM check confirms the Chakra tab actually renders.
 */
test.describe("Chakra", () => {
  test("1 — derived pool/reserve maxes follow the README formulas", async ({ page }) => {
    const r = await page.evaluate(async () => {
      const api = game.modules.get("naruto-d20").api;
      const actor = api.getActor();
      await api.resetActor(actor);

      const level = actor.system.details?.level?.value || actor.system.details?.cr?.total || 0;
      const conMod = actor.system.abilities?.con?.mod ?? 0;
      const c = api.getChakra(actor);
      return {
        level,
        conMod,
        poolMax: c.pool.max,
        reserveMax: c.reserve.max,
        expectedPool: 2 + (2 + conMod) * level + c.pool.maxBonus,
        expectedReserve: 2 * level + c.reserve.maxBonus,
      };
    });

    expect(r.poolMax).toBe(r.expectedPool);
    expect(r.reserveMax).toBe(r.expectedReserve);
  });

  test("2 — changing Con recomputes pool.max and keeps current values", async ({ page }) => {
    const r = await page.evaluate(async () => {
      const api = game.modules.get("naruto-d20").api;
      const actor = api.getActor();
      await api.resetActor(actor);

      const origCon = actor.system.abilities?.con?.value ?? 10;
      const level = actor.system.details?.level?.value || actor.system.details?.cr?.total || 0;

      // Set a known current pool value, then bump Con by +2 (≈ +1 mod).
      await api.resetActor(actor, { pool: 3, temp: 0 });
      await api.setAbility(actor, "con", origCon + 2);
      const after = api.getChakra(actor);
      const conMod = actor.system.abilities?.con?.mod ?? 0;

      return {
        level,
        conMod,
        poolMaxAfter: after.pool.max,
        poolValueAfter: after.pool.value,
        expected: 2 + (2 + conMod) * level + after.pool.maxBonus,
      };
    });

    expect(r.poolMaxAfter).toBe(r.expected);
    // The current value is not wiped by the recompute.
    expect(r.poolValueAfter).toBe(3);
  });

  test("3 — Pool, Temp, and Reserve edits persist after closing the sheet", async ({ page }) => {
    const appId = await page.evaluate(async () => {
      const api = game.modules.get("naruto-d20").api;
      const actor = api.getActor();
      await api.resetActor(actor);
      await actor.sheet.render(true);
      return actor.sheet.id;
    });

    const sheet = page.locator(`#${appId}`);
    await sheet.locator("a[data-tab='chakra']").click();
    const pool = sheet.locator("[name='flags.naruto-d20.chakra.pool.value']");
    const temp = sheet.locator("[name='flags.naruto-d20.chakra.pool.temp']");
    const reserve = sheet.locator("[name='flags.naruto-d20.chakra.reserve.value']");

    await pool.fill("5");
    await pool.press("Tab");
    await temp.fill("4");
    await temp.press("Tab");
    await reserve.fill("6");
    await reserve.press("Tab");

    await expect
      .poll(() =>
        page.evaluate(() => {
          const api = game.modules.get("naruto-d20").api;
          return api.getChakra(api.getActor());
        }),
      )
      .toMatchObject({
        pool: { value: 5, temp: 4 },
        reserve: { value: 6 },
      });

    await page.evaluate(async () => {
      const actor = game.modules.get("naruto-d20").api.getActor();
      await actor.sheet.close({ force: true });
      await actor.sheet.render(true);
    });

    const reopened = page.locator(`#${appId}`);
    await reopened.locator("a[data-tab='chakra']").click();
    await expect(reopened.locator("[name='flags.naruto-d20.chakra.pool.value']")).toHaveValue("5");
    await expect(reopened.locator("[name='flags.naruto-d20.chakra.pool.temp']")).toHaveValue("4");
    await expect(reopened.locator("[name='flags.naruto-d20.chakra.reserve.value']")).toHaveValue(
      "6",
    );
  });

  test("4 — Reserve below 50% (but >0) triggers Low Reserves + fatigued", async ({ page }) => {
    const r = await page.evaluate(async () => {
      const api = game.modules.get("naruto-d20").api;
      const actor = api.getActor();
      // full reserve first, then drop to ~25%
      await api.resetActor(actor);
      const max = api.getChakra(actor).reserve.max;
      const low = Math.max(1, Math.floor(max * 0.25));
      await api.resetActor(actor, { reserve: low });
      return { low, max, conditions: api.getConditions(actor) };
    });

    expect(r.low).toBeGreaterThan(0);
    expect(r.conditions.lowReserves).toBe(true);
    expect(r.conditions.chakraDepletion).toBe(false);
    expect(r.conditions.fatigued).toBe(true);
  });

  test("5 — Reserve at 0 triggers Chakra Depletion + exhausted, drops Low Reserves", async ({
    page,
  }) => {
    const r = await page.evaluate(async () => {
      const api = game.modules.get("naruto-d20").api;
      const actor = api.getActor();
      await api.resetActor(actor, { reserve: 0 });
      return api.getConditions(actor);
    });

    expect(r.chakraDepletion).toBe(true);
    expect(r.exhausted).toBe(true);
    expect(r.lowReserves).toBe(false);
  });

  test("6 — a fatigued the module did NOT apply is preserved when reserve recovers", async ({
    page,
  }) => {
    const r = await page.evaluate(async () => {
      const api = game.modules.get("naruto-d20").api;
      const actor = api.getActor();

      // Clean slate at full reserve, then apply fatigued from an "external" source.
      await api.resetActor(actor);
      await api.setCondition(actor, "fatigued", true);

      // Recover reserve above 50% and re-evaluate conditions.
      await api.checkAndUpdateConditions(actor);
      const conditions = api.getConditions(actor);

      // cleanup
      await api.setCondition(actor, "fatigued", false);
      return conditions;
    });

    // Module must not remove a fatigued it did not apply.
    expect(r.fatigued).toBe(true);
    expect(r.appliedFatigued).toBe(false);
  });

  test("UI — the Chakra tab renders its core controls", async ({ page }) => {
    // Open the actor sheet via the API, then assert the tab content exists.
    await page.evaluate(async () => {
      const api = game.modules.get("naruto-d20").api;
      const actor = api.getActor();
      await actor.sheet.render(true);
    });

    const chakraTab = page.locator(
      ".app.sheet .tab[data-tab='chakra'], .application .tab[data-tab='chakra']",
    );
    await expect(chakraTab.first()).toBeAttached({ timeout: 15_000 });
    await expect(chakraTab.first().locator(".tap-reserve-roll")).toBeAttached();
    await expect(
      chakraTab.first().locator("[name='flags.naruto-d20.chakra.nature.primary']"),
    ).toBeAttached();
    await expect(chakraTab.first().locator(".naruto-techniques")).toBeAttached();
  });
});
