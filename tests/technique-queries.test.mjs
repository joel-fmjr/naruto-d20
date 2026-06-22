import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { listLearnable, listMasterable } from "../scripts/features/techniques/queries.mjs";

// Defensive Foundry-global stubs, matching tests/helpers.test.mjs convention.
globalThis.foundry ??= { utils: { deepClone: (v) => structuredClone(v) } };
globalThis.game ??= { settings: { get: () => false } };

function technique({ id, learned = false, mastery = 0, type = "naruto-d20.technique" } = {}) {
  return {
    _id: id,
    type,
    name: id,
    // discipline MUST map to a real skill (DISCIPLINE_SKILL_MAP). A mapped
    // discipline (e.g. "Ninjutsu" -> "nin") makes isTechniqueEffectivelyLearned
    // fall through to `learning.learned`; an unmapped/"" discipline would make
    // the item read as auto-learned and break these tests.
    system: { discipline: "Ninjutsu", learning: { learned }, mastery },
  };
}

function actor(items) {
  return { items };
}

describe("listLearnable", () => {
  it("returns only unlearned technique items", () => {
    const a = actor([
      technique({ id: "unlearned", learned: false }),
      technique({ id: "learned", learned: true }),
    ]);
    const result = listLearnable(a).map((i) => i._id);
    assert.deepEqual(result, ["unlearned"]);
  });

  it("ignores non-technique items", () => {
    const a = actor([
      technique({ id: "tech", learned: false }),
      { _id: "weapon", type: "weapon", system: {} },
    ]);
    assert.deepEqual(listLearnable(a).map((i) => i._id), ["tech"]);
  });

  it("returns [] when the actor has no items", () => {
    assert.deepEqual(listLearnable({}), []);
  });
});

describe("listMasterable", () => {
  it("returns learned techniques below max mastery", () => {
    const a = actor([
      technique({ id: "learned-low", learned: true, mastery: 2 }),
      technique({ id: "learned-max", learned: true, mastery: 5 }),
      technique({ id: "unlearned", learned: false, mastery: 0 }),
    ]);
    assert.deepEqual(listMasterable(a).map((i) => i._id), ["learned-low"]);
  });

  it("returns [] when the actor has no items", () => {
    assert.deepEqual(listMasterable({}), []);
  });
});
