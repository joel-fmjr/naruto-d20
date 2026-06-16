import { test, expect } from "../fixtures.mjs";

/**
 * Regression: the custom Chakra conditions are registered in `pf1PostInit`,
 * which fires AFTER pf1 builds `CONFIG.statusEffects`. If we don't append them
 * to `CONFIG.statusEffects`, the conditions still apply (they live in
 * `pf1.registry.conditions`) but PF1e's TokenHUD crashes when right-clicking a
 * token that carries one:
 *
 *   TokenHUDPF._getStatusEffectChoices → core[statusId] is undefined
 *   → "Cannot read properties of undefined (reading 'isActive')"
 *
 * These tests pin the fix at both the root cause (registration into
 * CONFIG.statusEffects) and the user-visible symptom (the HUD choices build).
 */
test.describe("Chakra condition token HUD", () => {
  test("registers custom conditions into CONFIG.statusEffects", async ({ page }) => {
    const ids = await page.evaluate(() =>
      CONFIG.statusEffects.filter((s) => ["lowReserves", "chakraDepletion"].includes(s.id)).map(
        (s) => s.id,
      ),
    );

    expect(ids).toContain("lowReserves");
    expect(ids).toContain("chakraDepletion");
  });

  test("token HUD status choices build for an actor carrying a chakra condition", async ({
    page,
  }) => {
    const r = await page.evaluate(async () => {
      const api = game.modules.get("naruto-d20").api;
      const actor = api.getActor();

      // Drop reserve below 25% out of combat → lowReserves + fatigued applied.
      await api.resetActor(actor);
      const max = api.getChakra(actor).reserve.max;
      await api.resetActor(actor, { reserve: Math.max(1, Math.floor(max * 0.2)) });

      const tokenDoc = await api.createToken(actor);
      // The placeable is drawn asynchronously after the document is created.
      const deadline = Date.now() + 5000;
      let placeable = canvas.tokens.get(tokenDoc.id);
      while (!placeable?.actor && Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 25));
        placeable = canvas.tokens.get(tokenDoc.id);
      }

      const hud = canvas.hud.token;
      // bind() wires this.object/this.document onto the HUD (this is what makes
      // this.actor resolve). It also renders, which is the path that crashes when
      // the condition is missing from CONFIG.statusEffects — so swallow any bind
      // throw here and assert against the method call below.
      await hud.bind(placeable).catch(() => {});

      const actorBound = Boolean(hud.actor); // proves the choices loop runs on our actor
      let threw = false;
      let error = null;
      let choices = null;
      try {
        choices = hud._getStatusEffectChoices();
      } catch (e) {
        threw = true;
        error = e.message;
      } finally {
        await hud.clear?.();
      }

      return {
        conditions: api.getConditions(actor),
        actorBound,
        threw,
        error,
        hasLowReserves: Boolean(choices?.lowReserves),
      };
    });

    expect(r.conditions.lowReserves).toBe(true);
    expect(r.actorBound).toBe(true);
    expect(r.threw, r.error ?? "").toBe(false);
    expect(r.hasLowReserves).toBe(true);
  });
});
