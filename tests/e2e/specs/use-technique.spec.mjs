import { test, expect } from "../fixtures.mjs";
import { PERFORM_TECHNIQUE } from "../session.mjs";

async function prepareYouton(page) {
  return page.evaluate(async (name) => {
    const api = game.modules.get("naruto-d20").api;
    const actor = api.getActor();
    const item = api.getTechnique(actor, name);
    if (!item) throw new Error(`Required technique "${name}" is missing from the fixture clone`);

    await item.update({
      "system.learning.learned": true,
      "system.mastery": 0,
      "system.automation.enabled": false,
    });
    await api.setSetting("enforceLearning", true);
    await api.resetActor(actor);

    const current = actor.items.get(item.id);
    return {
      state: api.techniquePerformState(actor, current),
      cost: current.system.chakraCost,
    };
  }, PERFORM_TECHNIQUE);
}

test.describe("Technique perform", () => {
  test("YOUTON fixture requires a perform roll", async ({ page }) => {
    const fixture = await prepareYouton(page);

    expect(fixture.state.skillKey).toBe("gnj");
    expect(fixture.state.bypasses).toBe(false);
    expect(fixture.cost).toBeGreaterThan(0);
  });

  test("forced perform failure posts a failure card and spends no chakra", async ({ page }) => {
    await prepareYouton(page);
    const result = await page.evaluate(
      async ({ name }) => {
        const api = game.modules.get("naruto-d20").api;
        const actor = api.getActor();
        const before = api.getChakra(actor);
        const performed = await api.performByName(actor, name, {
          forceRoll: 1,
          rollBonus: -100,
        });
        return { before, performed };
      },
      { name: PERFORM_TECHNIQUE },
    );

    expect(result.performed.chakra.available).toBe(result.before.available);
    expect(
      result.performed.messages.some((message) =>
        message.content.includes("naruto-technique-card failed"),
      ),
    ).toBe(true);
    expect(
      result.performed.messages.some((message) =>
        message.content.includes("naruto-technique-card success"),
      ),
    ).toBe(false);
  });

  test("forced perform success runs the PF1e action and spends chakra afterward", async ({
    page,
  }) => {
    const fixture = await prepareYouton(page);
    const result = await page.evaluate(
      async ({ name }) => {
        const api = game.modules.get("naruto-d20").api;
        const actor = api.getActor();
        const before = api.getChakra(actor);
        const performed = await api.performByName(actor, name, {
          forceRoll: 20,
          rollBonus: 100,
        });
        return { before, performed };
      },
      { name: PERFORM_TECHNIQUE },
    );

    expect(result.performed.warnings).toEqual([]);
    expect(result.performed.chakra.available).toBe(result.before.available - fixture.cost);
    expect(result.performed.messages.some((message) => message.total !== null)).toBe(true);
    expect(
      result.performed.messages.some((message) =>
        message.content.includes("naruto-technique-card success"),
      ),
    ).toBe(true);
    expect(
      result.performed.messages.some((message) => message.content.includes(PERFORM_TECHNIQUE)),
    ).toBe(true);
  });

  test("mastery threshold bypasses the perform roll but still runs the action", async ({
    page,
  }) => {
    await prepareYouton(page);
    const result = await page.evaluate(
      async ({ name }) => {
        const api = game.modules.get("naruto-d20").api;
        const actor = api.getActor();
        const item = api.getTechnique(actor, name);
        const stateBefore = api.techniquePerformState(actor, item);

        let mastery = 0;
        while (mastery < 5) {
          mastery += 1;
          await item.update({ "system.mastery": mastery });
          if (api.techniquePerformState(actor, actor.items.get(item.id)).bypasses) break;
        }

        const current = actor.items.get(item.id);
        const stateAfter = api.techniquePerformState(actor, current);
        const before = api.getChakra(actor);
        const performed = await api.performByName(actor, name);
        return { stateBefore, stateAfter, before, performed };
      },
      { name: PERFORM_TECHNIQUE },
    );

    expect(result.stateBefore.bypasses).toBe(false);
    expect(result.stateAfter.bypasses).toBe(true);
    expect(result.performed.chakra.available).toBeLessThan(result.before.available);
    expect(result.performed.messages.some((message) => message.total !== null)).toBe(false);
    expect(
      result.performed.messages.some((message) =>
        message.content.includes("naruto-technique-card"),
      ),
    ).toBe(false);
    expect(
      result.performed.messages.some((message) => message.content.includes(PERFORM_TECHNIQUE)),
    ).toBe(true);
  });
});

test.describe("Technique chakra rules", () => {
  test("Reserve does not make an otherwise unaffordable technique usable", async ({ page }) => {
    await prepareYouton(page);
    const result = await page.evaluate(
      async ({ name }) => {
        const api = game.modules.get("naruto-d20").api;
        const actor = api.getActor();
        const item = api.getTechnique(actor, name);
        const cost = item.system.chakraCost;
        await api.resetActor(actor, { temp: 0, pool: Math.max(0, cost - 1), reserve: 10 });
        const before = api.getChakra(actor);
        const performed = await api.performByName(actor, name, {
          forceRoll: 20,
          rollBonus: 100,
        });
        return { cost, before, performed };
      },
      { name: PERFORM_TECHNIQUE },
    );

    expect(result.before.available).toBeLessThan(result.cost);
    expect(result.performed.warnings.length).toBeGreaterThan(0);
    expect(result.performed.chakra).toEqual(result.before);
    expect(result.performed.messages).toEqual([]);
  });

  test("Emergency Transfer is triggered by the complete technique-use flow", async ({ page }) => {
    await prepareYouton(page);
    const result = await page.evaluate(
      async ({ name }) => {
        const api = game.modules.get("naruto-d20").api;
        const actor = api.getActor();
        const item = api.getTechnique(actor, name);
        const cost = item.system.chakraCost;
        await api.resetActor(actor, { temp: 0, pool: cost, reserve: 10 });
        const performed = await api.performByName(actor, name, {
          forceRoll: 20,
          rollBonus: 100,
        });
        return { cost, performed };
      },
      { name: PERFORM_TECHNIQUE },
    );

    expect(result.performed.chakra.pool.value).toBe(1);
    expect(result.performed.chakra.reserve.value).toBe(0);
    expect(result.performed.conditions.chakraDepletion).toBe(true);
  });
});
