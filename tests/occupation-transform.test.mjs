import test from "node:test";
import assert from "node:assert/strict";
import {
  convertSkillKey,
  dedupeByKey,
  transformOccupationFlag,
  transformOccupationDoc,
} from "../tools/occupation-transform.mjs";

test("convertSkillKey maps ninja lore (slug or lor key) to kar", () => {
  assert.equal(
    convertSkillKey({ label: "Knowledge (ninja lore)", slug: "knowledge-ninja-lore", key: "lor" }).key,
    "kar",
  );
  assert.equal(convertSkillKey({ label: "Lore", slug: "lore", key: "lor" }).key, "kar");
  assert.equal(convertSkillKey({ label: "Stealth", slug: "stealth", key: "ste" }).key, "ste");
});

test("dedupeByKey keeps first occurrence per key", () => {
  const out = dedupeByKey([
    { key: "kar", label: "Knowledge (tactics)" },
    { key: "kar", label: "Knowledge (ninja lore)" },
    { key: "ste", label: "Stealth" },
  ]);
  assert.deepEqual(out.map((o) => o.key), ["kar", "ste"]);
  assert.equal(out[0].label, "Knowledge (tactics)");
});

test("transformOccupationFlag converts, dedupes, and clamps skillSelectCount", () => {
  const occ = transformOccupationFlag({
    skillSelectCount: 3,
    classSkillOptions: [
      { label: "Knowledge (tactics)", slug: "knowledge-arcana", key: "kar" },
      { label: "Knowledge (ninja lore)", slug: "knowledge-ninja-lore", key: "lor" },
      { label: "Stealth", slug: "stealth", key: "ste" },
    ],
    fixedClassSkills: [],
  });
  assert.deepEqual(occ.classSkillOptions.map((o) => o.key), ["kar", "ste"]);
  assert.equal(occ.skillSelectCount, 2);
});

test("transformOccupationDoc swaps namespace and icon", () => {
  const doc = transformOccupationDoc({
    name: "Academy Student",
    img: "modules/naruto-d20-kaihou/assets/theme/icons/items/title.svg",
    flags: { "naruto-d20-kaihou": { occupation: { slug: "academy-student", classSkillOptions: [], fixedClassSkills: [], skillSelectCount: 0 } } },
  });
  assert.equal(doc.img, "icons/skills/social/diplomacy-peace-alliance.webp");
  assert.equal(doc.flags["naruto-d20-kaihou"], undefined);
  assert.equal(doc.flags["naruto-d20"].occupation.slug, "academy-student");
});
