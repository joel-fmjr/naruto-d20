import { test, expect } from "../fixtures.mjs";

const BUFF_PACK = "naruto-d20.technique-buffs";
const BUFF_TECHNIQUE = "BUNSHIN NO JUTSU (DUPLICATION TECHNIQUE)";

async function prepareBuffTechnique(page, targetMode = "self", name = BUFF_TECHNIQUE) {
  return page.evaluate(
    async ({ techniqueName, mode }) => {
      const api = game.modules.get("naruto-d20").api;
      const actor = api.getActor();
      const item = await api.ensureTechnique(actor, techniqueName, {
        update: {
          "system.learning.learned": true,
          "system.mastery": 1,
          "system.automation.enabled": true,
          "system.automation.targetMode": mode,
        },
      });
      await api.setSetting("automaticBuffs", true);
      await api.setSetting("buffTargetFiltering", "respectTechnique");
      await api.resetActor(actor);
      await api.clearAutomationBuffs(actor);
      api.clearBuffLookupCache();
      return {
        id: item.id,
        cost: item.system.chakraCost,
        perform: api.techniquePerformState(actor, item),
      };
    },
    { techniqueName: name, mode: targetMode },
  );
}

test.describe("Auto-buff lookup and application", () => {
  test("findBuffByName returns a non-empty exact match", async ({ page }) => {
    const result = await page.evaluate(async (packId) => {
      const api = game.modules.get("naruto-d20").api;
      const pack = game.packs.get(packId);
      const index = await pack.getIndex();
      const entry =
        index.contents.find((candidate) => !candidate.name.includes("(")) ?? index.contents[0];
      const match = await api.findBuffByName(entry.name);
      return { name: entry.name, exactCount: match.exact.length };
    }, BUFF_PACK);

    expect(result.name).toBeTruthy();
    expect(result.exactCount).toBeGreaterThan(0);
  });

  test("performing a self-target technique applies its buff after chakra spend", async ({
    page,
  }) => {
    const fixture = await prepareBuffTechnique(page);
    expect(fixture.perform.bypasses).toBe(true);

    const result = await page.evaluate(async (name) => {
      const api = game.modules.get("naruto-d20").api;
      const actor = api.getActor();
      const before = api.getChakra(actor);
      const performed = await api.performByName(actor, name);
      return {
        before,
        performed,
        buffs: api.listBuffs(actor).filter((buff) => buff.sourceId),
      };
    }, BUFF_TECHNIQUE);

    expect(result.performed.chakra.available).toBe(result.before.available - fixture.cost);
    expect(result.buffs).toHaveLength(1);
    expect(result.buffs[0].name).toBe(BUFF_TECHNIQUE);
    expect(result.buffs[0].active).toBe(true);
  });

  test("selected targeting applies the buff to the selected actor", async ({ page }) => {
    await prepareBuffTechnique(page, "selected");
    const result = await page.evaluate(async (name) => {
      const api = game.modules.get("naruto-d20").api;
      const actor = api.getActor();
      const target = await api.createTargetActor();
      await api.createToken(target, { x: 0, y: 0 });
      if (!api.setTargetByActor(target)) throw new Error("Target token was not created");

      await api.performByName(actor, name);
      return {
        casterBuffs: api.listBuffs(actor).filter((buff) => buff.sourceId),
        targetBuffs: api.listBuffs(target).filter((buff) => buff.sourceId),
      };
    }, BUFF_TECHNIQUE);

    expect(result.casterBuffs).toHaveLength(0);
    expect(result.targetBuffs).toHaveLength(1);
    expect(result.targetBuffs[0].name).toBe(BUFF_TECHNIQUE);
  });

  test("selected targeting without a target warns and applies nothing", async ({ page }) => {
    await prepareBuffTechnique(page, "selected");
    const result = await page.evaluate(async (name) => {
      const api = game.modules.get("naruto-d20").api;
      const actor = api.getActor();
      api.clearTargets();
      const performed = await api.performByName(actor, name);
      return {
        warnings: performed.warnings,
        buffs: api.listBuffs(actor).filter((buff) => buff.sourceId),
      };
    }, BUFF_TECHNIQUE);

    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.buffs).toHaveLength(0);
  });

  test("re-performing refreshes the existing buff instead of duplicating it", async ({ page }) => {
    await prepareBuffTechnique(page);
    const result = await page.evaluate(async (name) => {
      const api = game.modules.get("naruto-d20").api;
      const actor = api.getActor();
      await api.performByName(actor, name);
      const first = api.listBuffs(actor).filter((buff) => buff.sourceId);
      await api.performByName(actor, name);
      const second = api.listBuffs(actor).filter((buff) => buff.sourceId);
      return { first, second };
    }, BUFF_TECHNIQUE);

    expect(result.first).toHaveLength(1);
    expect(result.second).toHaveLength(1);
    expect(result.second[0].id).toBe(result.first[0].id);
    expect(result.second[0].active).toBe(true);
  });

  test("exact module and custom pack matches beat lower-priority duplicates", async ({ page }) => {
    const result = await page.evaluate(
      async ({ defaultName }) => {
        const api = game.modules.get("naruto-d20").api;
        const actor = api.getActor();
        const uniqueName = `E2E LOOKUP ${Date.now()}`;
        const sources = await api.createBuffLookupFixture({
          packNames: [defaultName, uniqueName, `${uniqueName} (Variant)`],
          worldNames: [defaultName, uniqueName],
        });
        await api.setSetting("automaticBuffs", true);
        await api.setSetting("buffTargetFiltering", "respectTechnique");
        await api.setSetting("customBuffCompendia", sources.packId);
        api.clearBuffLookupCache();

        const defaultTechnique = await api.ensureTechnique(actor, defaultName, {
          update: {
            "system.learning.learned": true,
            "system.mastery": 1,
            "system.automation.enabled": true,
            "system.automation.targetMode": "self",
          },
        });
        const source = defaultTechnique.toObject();
        delete source._id;
        source.name = uniqueName;
        const [uniqueTechnique] = await actor.createEmbeddedDocuments("Item", [source]);

        await api.resetActor(actor);
        await api.performByName(actor, defaultName);
        const defaultApplied = api.listBuffs(actor).find((buff) => buff.name === defaultName);

        await api.performByName(actor, uniqueTechnique.name);
        const uniqueApplied = api.listBuffs(actor).find((buff) => buff.name === uniqueName);

        const defaultMatch = await api.findBuffByName(defaultName);
        const moduleEntry = defaultMatch.exact[0];
        const moduleUuid = game.packs.get(moduleEntry.packId).getUuid(moduleEntry._id);
        const customUuid = sources.pack.find((entry) => entry.name === uniqueName).uuid;
        return {
          defaultSourceId: defaultApplied?.sourceId ?? null,
          uniqueSourceId: uniqueApplied?.sourceId ?? null,
          moduleUuid,
          customUuid,
        };
      },
      { defaultName: BUFF_TECHNIQUE },
    );

    expect(result.defaultSourceId).toBe(result.moduleUuid);
    expect(result.uniqueSourceId).toBe(result.customUuid);
  });

  test("PF1e duration expiry removes an automation-created buff", async ({ page }) => {
    await prepareBuffTechnique(page);
    const result = await page.evaluate(async (name) => {
      const api = game.modules.get("naruto-d20").api;
      const actor = api.getActor();
      await api.performByName(actor, name);
      const before = api.listBuffs(actor).filter((buff) => buff.sourceId);
      await api.expireActorEffects(actor);
      const after = api.listBuffs(actor).filter((buff) => buff.sourceId);
      return { before, after };
    }, BUFF_TECHNIQUE);

    expect(result.before).toHaveLength(1);
    expect(result.after).toHaveLength(0);
  });
});
