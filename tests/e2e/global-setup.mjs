import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { ACTOR, PERFORM_TECHNIQUE, STORAGE_STATE, ensureReady } from "./session.mjs";

export default async function globalSetup() {
  mkdirSync(dirname(STORAGE_STATE), { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Log in and reach the world (API not required yet — we may be enabling it).
    await ensureReady(page, { requireApi: false });

    const probe = await page.evaluate(
      ({ actorName, techniqueName }) => {
        const found = game.actors.getName(actorName);
        return {
          world: game.world?.id ?? game.world?.title ?? "?",
          isGM: game.user?.isGM ?? false,
          found: Boolean(found),
          resolved: found?.name ?? null,
          hasTechnique: Boolean(
            found?.items.find(
              (item) => item.type === "naruto-d20.technique" && item.name === techniqueName,
            ),
          ),
          actors: game.actors.contents.map((a) => a.name),
        };
      },
      { actorName: ACTOR, techniqueName: PERFORM_TECHNIQUE },
    );
    if (!probe.isGM) {
      throw new Error("FOUNDRY_USER must identify a GM user for the E2E suite");
    }
    if (!probe.found) {
      throw new Error(
        `Test actor "${ACTOR}" not found in world "${probe.world}". ` +
          `Open the test world that contains it, or set FOUNDRY_ACTOR. ` +
          `Actors present: ${probe.actors.join(", ") || "(none)"}`,
      );
    }
    if (!probe.hasTechnique) {
      throw new Error(`Test actor "${ACTOR}" does not contain "${PERFORM_TECHNIQUE}"`);
    }
    await context.storageState({ path: STORAGE_STATE });
  } finally {
    await browser.close();
  }
}
