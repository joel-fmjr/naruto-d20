import { test, expect } from "../fixtures.mjs";

async function openTapReserves(page, state) {
  const appId = await page.evaluate(async (chakraState) => {
    const api = game.modules.get("naruto-d20").api;
    const actor = api.getActor();
    await api.resetActor(actor, chakraState);
    await actor.sheet.render(true);
    return actor.sheet.id;
  }, state);

  const sheet = page.locator(`#${appId}`);
  await sheet.locator("a[data-tab='chakra']").click();
  await sheet.locator(".tap-reserve-roll").click();
  const dialog = page.locator("#tap-reserves-dialog");
  await expect(dialog).toBeVisible();
  return dialog;
}

test.describe("Tap Reserves", () => {
  test("opens from Chakra and calculates DC for every seal", async ({ page }) => {
    const dialog = await openTapReserves(page, { reserve: 8, temp: 0 });
    const amount = dialog.locator(".tap-amount");
    const dc = dialog.locator(".tap-dc-value");

    await amount.fill("3");
    await expect(dc).toHaveText("13");

    await dialog.locator("[name='seal-type'][value='half']").check();
    await expect(dc).toHaveText("11");

    await dialog.locator("[name='seal-type'][value='hand']").check();
    await expect(dc).toHaveText("8");
  });

  test("draining zero warns and changes nothing", async ({ page }) => {
    const dialog = await openTapReserves(page, { reserve: 6, temp: 0 });
    const before = await page.evaluate(() => {
      const api = game.modules.get("naruto-d20").api;
      api.clearNotifications();
      return api.getChakra(api.getActor());
    });

    await dialog.locator(".tap-amount").fill("0");
    await dialog.locator(".roll-btn").click();
    await expect(page.locator(".notification.warning").last()).toBeVisible();

    const after = await page.evaluate(() => {
      const api = game.modules.get("naruto-d20").api;
      return api.getChakra(api.getActor());
    });
    expect(after).toEqual(before);
  });

  test("draining more than Reserve warns and changes nothing", async ({ page }) => {
    const dialog = await openTapReserves(page, { reserve: 3, temp: 0 });
    const before = await page.evaluate(() => {
      const api = game.modules.get("naruto-d20").api;
      api.clearNotifications();
      return api.getChakra(api.getActor());
    });

    await dialog.locator(".tap-amount").fill("99");
    await dialog.locator(".roll-btn").click();
    await expect(page.locator(".notification.warning").last()).toBeVisible();

    const after = await page.evaluate(() => {
      const api = game.modules.get("naruto-d20").api;
      return api.getChakra(api.getActor());
    });
    expect(after).toEqual(before);
  });

  test("successful roll moves Reserve to Temp and posts the PF1e card", async ({ page }) => {
    const dialog = await openTapReserves(page, { reserve: 8, temp: 1 });
    const startedAt = await page.evaluate(() => {
      const api = game.modules.get("naruto-d20").api;
      const actor = api.getActor();
      api.forceNextRoll(actor, 20, 100);
      return api.now();
    });

    await dialog.locator(".tap-amount").fill("3");
    await dialog.locator(".roll-btn").click();
    await expect(dialog).toBeHidden();

    const result = await page.evaluate((timestamp) => {
      const api = game.modules.get("naruto-d20").api;
      const actor = api.getActor();
      return {
        chakra: api.getChakra(actor),
        messages: api.chatSince(timestamp),
      };
    }, startedAt);

    expect(result.chakra.reserve.value).toBe(5);
    expect(result.chakra.pool.temp).toBe(4);
    expect(result.messages.some((message) => message.total !== null)).toBe(true);
    expect(result.messages.some((message) => message.rerollSource === "tap-reserves")).toBe(true);
  });

  test("failed roll leaves Reserve and Temp unchanged", async ({ page }) => {
    const dialog = await openTapReserves(page, { reserve: 8, temp: 1 });
    const before = await page.evaluate(() => {
      const api = game.modules.get("naruto-d20").api;
      const actor = api.getActor();
      api.forceNextRoll(actor, 1, -100);
      return api.getChakra(actor);
    });

    await dialog.locator(".tap-amount").fill("5");
    await dialog.locator(".roll-btn").click();
    await expect(dialog).toBeHidden();

    const after = await page.evaluate(() => {
      const api = game.modules.get("naruto-d20").api;
      return api.getChakra(api.getActor());
    });
    expect(after).toEqual(before);
  });

  test("draining Reserve to zero recalculates Chakra Depletion", async ({ page }) => {
    const dialog = await openTapReserves(page, { reserve: 3, temp: 0 });
    await page.evaluate(() => {
      const api = game.modules.get("naruto-d20").api;
      api.forceNextRoll(api.getActor(), 20, 100);
    });

    await dialog.locator(".tap-amount").fill("3");
    await dialog.locator("[name='seal-type'][value='hand']").check();
    await dialog.locator(".roll-btn").click();
    await expect(dialog).toBeHidden();

    const result = await page.evaluate(() => {
      const api = game.modules.get("naruto-d20").api;
      const actor = api.getActor();
      return { chakra: api.getChakra(actor), conditions: api.getConditions(actor) };
    });
    expect(result.chakra.reserve.value).toBe(0);
    expect(result.conditions.chakraDepletion).toBe(true);
  });
});
