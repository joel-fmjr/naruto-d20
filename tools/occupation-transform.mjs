/**
 * Pure transform from kaihou occupation source JSON to naruto-d20 source JSON.
 * Build-time only; imported by tools/import-occupations.mjs and the unit tests.
 */

const NINJA_LORE_SLUG = "knowledge-ninja-lore";
const DEFAULT_OPTS = {
  oldNs: "naruto-d20-kaihou",
  newNs: "naruto-d20",
  img: "icons/skills/social/diplomacy-peace-alliance.webp",
};

export function convertSkillKey(option) {
  if (option?.slug === NINJA_LORE_SLUG || option?.key === "lor") {
    return { ...option, key: "kar" };
  }
  return { ...option };
}

export function dedupeByKey(options) {
  const seen = new Set();
  const out = [];
  for (const option of options ?? []) {
    if (option?.key == null || seen.has(option.key)) continue;
    seen.add(option.key);
    out.push(option);
  }
  return out;
}

export function transformOccupationFlag(occupation) {
  const classSkillOptions = dedupeByKey((occupation.classSkillOptions ?? []).map(convertSkillKey));
  const fixedClassSkills = dedupeByKey((occupation.fixedClassSkills ?? []).map(convertSkillKey));
  const requested = Number(occupation.skillSelectCount ?? 0) || 0;
  const skillSelectCount = Math.min(requested, classSkillOptions.length);
  return { ...occupation, classSkillOptions, fixedClassSkills, skillSelectCount };
}

export function transformOccupationDoc(doc, opts = {}) {
  const { oldNs, newNs, img } = { ...DEFAULT_OPTS, ...opts };
  const occupation = doc.flags?.[oldNs]?.occupation ?? {};
  const flags = { ...(doc.flags ?? {}) };
  delete flags[oldNs];
  flags[newNs] = { ...(flags[newNs] ?? {}), occupation: transformOccupationFlag(occupation) };
  return { ...doc, img, flags };
}
