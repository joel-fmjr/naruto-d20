import { test as base, expect } from "@playwright/test";
import { ACTOR, PERFORM_TECHNIQUE, STORAGE_STATE, ensureReady } from "./session.mjs";

/**
 * Fixtures for the naruto-d20 E2E suite.
 *
 * Foundry is a single shared, stateful world, so logging in per test is both
 * slow and pointless. A worker-scoped context logs in once (reusing the
 * persisted storageState) and reaches a ready, test-API-installed world; the
 * built-in `page` fixture is overridden to hand every test that same page.
 * With workers=1 (see playwright.config) the whole suite shares one login.
 *
 * Tests drive the rules through `page.evaluate`, resolving the API in-browser:
 *   const api = game.modules.get("naruto-d20").api;
 *   const actor = api.getActor();          // disposable clone for this test
 * All API methods return plain serializable snapshots so results cross the
 * evaluate boundary cleanly. Isolation comes from a disposable actor clone.
 */
export const test = base.extend({
  // Worker-scoped: one logged-in, ready Foundry page reused by all tests.
  worldPage: [
    async ({ browser }, use) => {
      const context = await browser.newContext({ storageState: STORAGE_STATE });
      const page = await context.newPage();
      await ensureReady(page, { requireApi: false });
      await page.evaluate(async () => {
        const { installTestApi } = await import("/modules/naruto-d20/scripts/testing/test-api.mjs");
        installTestApi();
      });
      await use(page);
      await page
        .evaluate(() => game.modules.get("naruto-d20")?.api?.endTestFixture())
        .catch(() => {});
      await context.close();
    },
    { scope: "worker" },
  ],

  // Override the built-in test-scoped `page` to yield the shared world page,
  // so existing specs keep using `{ page }`.
  page: async ({ worldPage }, use) => {
    await use(worldPage);
  },

  e2eFixture: [
    async ({ worldPage, runtimeErrors: _runtimeErrors }, use) => {
      const fixture = await worldPage.evaluate(
        ({ sourceActorName, requiredTechnique }) =>
          game.modules
            .get("naruto-d20")
            .api.beginTestFixture({ sourceActorName, requiredTechnique }),
        { sourceActorName: ACTOR, requiredTechnique: PERFORM_TECHNIQUE },
      );
      try {
        await use(fixture);
      } finally {
        await worldPage.evaluate(() => game.modules.get("naruto-d20").api.endTestFixture());
      }
    },
    { auto: true },
  ],

  runtimeErrors: [
    async ({ worldPage }, use) => {
      const errors = [];
      const onPageError = (error) => errors.push(`pageerror: ${error.stack ?? error.message}`);
      const onConsole = (message) => {
        if (message.type() === "error") errors.push(`console.error: ${message.text()}`);
      };
      worldPage.on("pageerror", onPageError);
      worldPage.on("console", onConsole);
      try {
        await use(errors);
      } finally {
        worldPage.off("pageerror", onPageError);
        worldPage.off("console", onConsole);
      }
      expect(errors, errors.join("\n")).toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
