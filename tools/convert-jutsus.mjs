/**
 * Convert all_jutsus.json → packs/_source/techniques/*.json
 *
 * Run with: node tools/convert-jutsus.mjs
 * (or: npm run convert)
 */

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { randomUUID } from "crypto";

const __dir  = dirname(fileURLToPath(import.meta.url));
const ROOT   = join(__dir, "..");
const SRC    = join(ROOT, "all_jutsus.json");
const OUT    = join(ROOT, "packs/_source/techniques");

// ── Complexity table (mirrors technique-model.mjs) ──────────────────────────
const COMPLEXITY_TABLE = {
    "Extremely Easy": { learnMod: 1,  successes: 1 },
    "Very Easy":      { learnMod: 1,  successes: 1 },
    "Easy":           { learnMod: 1,  successes: 1 },
    "E-Class":        { learnMod: 1,  successes: 1 },
    "D-Class":        { learnMod: 2,  successes: 1 },
    "C-Class":        { learnMod: 3,  successes: 2 },
    "B-Class":        { learnMod: 4,  successes: 3 },
    "A-Class":        { learnMod: 5,  successes: 4 },
    "S-Class":        { learnMod: 6,  successes: 5 },
    "SS-Class":       { learnMod: 7,  successes: 6 },
    "Epic":           { learnMod: 15, successes: 8 },
};

// Reverse lookup: (learnMod, successes) → complexity name.
// When learnMod=1,successes=1 matches multiple rows, "E-Class" wins (last entry wins in the loop,
// but we define E-Class last among the (1,1) group).
const REVERSE = new Map();
for (const [name, { learnMod, successes }] of Object.entries(COMPLEXITY_TABLE)) {
    REVERSE.set(`${learnMod}:${successes}`, name);
}

// Ordered list for nearest-match fallback (skip the duplicates of E-Class).
const COMPLEXITY_LIST = [
    { name: "E-Class",  learnMod: 1,  successes: 1 },
    { name: "D-Class",  learnMod: 2,  successes: 1 },
    { name: "C-Class",  learnMod: 3,  successes: 2 },
    { name: "B-Class",  learnMod: 4,  successes: 3 },
    { name: "A-Class",  learnMod: 5,  successes: 4 },
    { name: "S-Class",  learnMod: 6,  successes: 5 },
    { name: "SS-Class", learnMod: 7,  successes: 6 },
    { name: "Epic",     learnMod: 15, successes: 8 },
];

const DC_RE   = /<b>Learn DC:<\/b>\s*(\d+)/;
const SUCC_RE = /<b>Successes:<\/b>\s*(\d+)/;

function resolveComplexity(rank, descHtml) {
    const dcM   = DC_RE.exec(descHtml);
    const succM = SUCC_RE.exec(descHtml);
    if (!dcM || !succM) return "E-Class";

    const learnMod  = parseInt(dcM[1], 10) - 10 - rank;
    const successes = parseInt(succM[1], 10);

    const exact = REVERSE.get(`${learnMod}:${successes}`);
    if (exact) return exact;

    // Nearest match: minimise |Δ learnMod|, break ties with |Δ successes|.
    let best = "E-Class";
    let bestDist = Infinity;
    for (const row of COMPLEXITY_LIST) {
        const dist = Math.abs(row.learnMod - learnMod) * 100 + Math.abs(row.successes - successes);
        if (dist < bestDist) { bestDist = dist; best = row.name; }
    }
    return best;
}

// ── Component token → boolean field mapping ─────────────────────────────────
function parseComponents(raw) {
    const flags = {
        compHandSeals:     false,
        compHalfSeals:     false,
        compConcentration: false,
        compMobility:      false,
        compFocus:         false,
        compEmpower:       false,
        compMastery:       false,
        compPhysical:      false,
        compXpCost:        false,
    };
    if (!raw) return flags;

    for (const token of raw.split(",").map(t => t.trim())) {
        if (!token) continue;
        const t = token.toLowerCase();
        if (t === "hand seals" || t === "h *")        flags.compHandSeals     = true;
        if (t === "half-seals")                        flags.compHalfSeals     = true;
        if (t === "concentration")                     flags.compConcentration = true;
        if (t.startsWith("mob") || t.startsWith("mas mob")) flags.compMobility = true;
        if (t === "focus")                             flags.compFocus         = true;
        if (t === "empower" || t === "e *")            flags.compEmpower       = true;
        if (t.startsWith("mas") || t === "mastery")    flags.compMastery       = true;
        if (t === "physical")                          flags.compPhysical      = true;
        if (t === "xp cost" || t === "x")             flags.compXpCost        = true;
        // "M" / "M *" = Material component — no field in TechniqueDataModel, silently ignored.
    }
    return flags;
}

// ── Slug + ID helpers ────────────────────────────────────────────────────────
function slug(name) {
    return name.toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 64);
}

const ID_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
function randomId() {
    // Use Foundry's base62 charset (same as randomID() in foundry.mjs)
    return Array.from({ length: 16 }, () => ID_CHARS[Math.floor(Math.random() * 62)]).join("");
}

// Deterministic hash for picking icons from a pool without randomness.
function hashName(name) {
    let h = 0;
    for (let i = 0; i < name.length; i++) h = (Math.imul(31, h) + name.charCodeAt(i)) | 0;
    return Math.abs(h);
}

const M = "modules/naruto-d20/icons";

// Per-discipline icon pools — all paths verified to exist on disk.
const DISC_ICON_POOLS = {
    "Ninjutsu": [
        // fire / explosion / beams — offensive elemental ninjutsu
        `${M}/spells/fireball-red-1.jpg`,   `${M}/spells/fireball-red-2.jpg`,   `${M}/spells/fireball-red-3.jpg`,
        `${M}/spells/fireball-sky-1.jpg`,   `${M}/spells/fireball-sky-2.jpg`,   `${M}/spells/fireball-sky-3.jpg`,
        `${M}/spells/fireball-eerie-1.jpg`, `${M}/spells/fireball-eerie-2.jpg`, `${M}/spells/fireball-eerie-3.jpg`,
        `${M}/spells/explosion-red-1.jpg`,  `${M}/spells/explosion-red-2.jpg`,  `${M}/spells/explosion-red-3.jpg`,
        `${M}/spells/explosion-orange-1.jpg`,`${M}/spells/explosion-orange-2.jpg`,`${M}/spells/explosion-orange-3.jpg`,
        `${M}/spells/explosion-sky-1.jpg`,  `${M}/spells/explosion-sky-2.jpg`,  `${M}/spells/explosion-sky-3.jpg`,
        `${M}/spells/beam-red-1.jpg`,       `${M}/spells/beam-red-2.jpg`,       `${M}/spells/beam-red-3.jpg`,
        `${M}/spells/beam-blue-1.jpg`,      `${M}/spells/beam-blue-2.jpg`,      `${M}/spells/beam-blue-3.jpg`,
        `${M}/spells/beam-orange-1.jpg`,    `${M}/spells/beam-orange-2.jpg`,    `${M}/spells/beam-orange-3.jpg`,
        `${M}/spells/beam-sky-1.jpg`,       `${M}/spells/beam-sky-2.jpg`,       `${M}/spells/beam-sky-3.jpg`,
        `${M}/spells/beam-eerie-1.jpg`,     `${M}/spells/beam-eerie-2.jpg`,     `${M}/spells/beam-eerie-3.jpg`,
        `${M}/spells/fire-arrows-1.jpg`,    `${M}/spells/fire-arrows-2.jpg`,    `${M}/spells/fire-arrows-3.jpg`,
        `${M}/spells/fire-arrows-sky-1.jpg`,`${M}/spells/fire-arrows-sky-2.jpg`,`${M}/spells/fire-arrows-sky-3.jpg`,
        `${M}/spells/lighting-fire-1.jpg`,  `${M}/spells/lighting-fire-2.jpg`,  `${M}/spells/lighting-fire-3.jpg`,
        `${M}/spells/lighting-royal-1.jpg`, `${M}/spells/lighting-royal-2.jpg`, `${M}/spells/lighting-royal-3.jpg`,
        `${M}/spells/lighting-sky-1.jpg`,   `${M}/spells/lighting-sky-2.jpg`,   `${M}/spells/lighting-sky-3.jpg`,
        `${M}/spells/rock-orange-1.jpg`,    `${M}/spells/rock-orange-2.jpg`,    `${M}/spells/rock-orange-3.jpg`,
        `${M}/spells/rock-royal-1.jpg`,     `${M}/spells/rock-royal-2.jpg`,     `${M}/spells/rock-royal-3.jpg`,
        `${M}/spells/wind-sky-1.jpg`,       `${M}/spells/wind-sky-2.jpg`,       `${M}/spells/wind-sky-3.jpg`,
        `${M}/spells/wind-red-1.jpg`,       `${M}/spells/wind-red-2.jpg`,       `${M}/spells/wind-red-3.jpg`,
        `${M}/spells/air-burst-air-1.jpg`,  `${M}/spells/air-burst-air-2.jpg`,  `${M}/spells/air-burst-air-3.jpg`,
        `${M}/spells/needles-fire-1.jpg`,   `${M}/spells/needles-fire-2.jpg`,   `${M}/spells/needles-fire-3.jpg`,
        `${M}/spells/rip-sky-1.jpg`,        `${M}/spells/rip-sky-2.jpg`,        `${M}/spells/rip-sky-3.jpg`,
        `${M}/spells/slice-orange-1.jpg`,   `${M}/spells/slice-orange-2.jpg`,   `${M}/spells/slice-orange-3.jpg`,
        `${M}/spells/vines-jade-1.jpg`,     `${M}/spells/vines-jade-2.jpg`,     `${M}/spells/vines-jade-3.jpg`,
    ],
    "Taijutsu": [
        // physical combat feats + weapon skill icons
        `${M}/feats/stunning-fist.jpg`,         `${M}/feats/improved-unarmed-strike.jpg`,
        `${M}/feats/power-attack.jpg`,          `${M}/feats/combat-reflexes.jpg`,
        `${M}/feats/vital-strike.jpg`,          `${M}/feats/improved-vital-strike.jpg`,
        `${M}/feats/greater-vital-strike.jpg`,  `${M}/feats/weapon-finesse.jpg`,
        `${M}/feats/cleave.jpg`,                `${M}/feats/great-cleave.jpg`,
        `${M}/feats/dodge.jpg`,                 `${M}/feats/combat-expertise.jpg`,
        `${M}/feats/improved-grapple.jpg`,      `${M}/feats/greater-grapple.jpg`,
        `${M}/feats/improved-trip.jpg`,         `${M}/feats/greater-trip.jpg`,
        `${M}/feats/improved-disarm.png`,       `${M}/feats/scorpion-style.jpg`,
        `${M}/feats/shatter-defenses.jpg`,      `${M}/feats/medusas-wrath.jpg`,
        `${M}/feats/deadly-stroke.jpg`,         `${M}/feats/whirlwind-attack.jpg`,
        `${M}/feats/spring-attack.jpg`,         `${M}/feats/lunge.jpg`,
        `${M}/feats/mobility.jpg`,              `${M}/feats/acrobatic.jpg`,
        `${M}/feats/acrobatic-step.png`,        `${M}/feats/athletic.jpg`,
        `${M}/feats/blind-fight.jpg`,           `${M}/feats/deflect-arrows.jpg`,
        `${M}/feats/gorgons-fist.jpg`,          `${M}/feats/improved-critical.jpg`,
        `${M}/skills/weapon_01.jpg`,  `${M}/skills/weapon_02.jpg`,  `${M}/skills/weapon_03.jpg`,
        `${M}/skills/weapon_04.jpg`,  `${M}/skills/weapon_05.jpg`,  `${M}/skills/weapon_06.jpg`,
        `${M}/skills/weapon_07.jpg`,  `${M}/skills/weapon_08.jpg`,  `${M}/skills/weapon_09.jpg`,
        `${M}/skills/weapon_10.jpg`,  `${M}/skills/weapon_11.jpg`,  `${M}/skills/weapon_12.jpg`,
        `${M}/skills/weapon_13.jpg`,  `${M}/skills/weapon_14.jpg`,  `${M}/skills/weapon_15.jpg`,
        `${M}/skills/weapon_16.jpg`,  `${M}/skills/weapon_17.jpg`,  `${M}/skills/weapon_18.jpg`,
        `${M}/skills/weapon_20.jpg`,  `${M}/skills/weapon_22.jpg`,  `${M}/skills/weapon_25.jpg`,
        `${M}/spells/slice-sky-1.jpg`,  `${M}/spells/slice-sky-2.jpg`,  `${M}/spells/slice-sky-3.jpg`,
        `${M}/spells/rip-acid-1.jpg`,   `${M}/spells/rip-acid-2.jpg`,   `${M}/spells/rip-acid-3.jpg`,
    ],
    "Chakra Control": [
        // healing, light, enchantment — internal energy
        `${M}/spells/enchant-blue-1.jpg`,   `${M}/spells/enchant-blue-2.jpg`,   `${M}/spells/enchant-blue-3.jpg`,
        `${M}/spells/enchant-jade-1.jpg`,   `${M}/spells/enchant-jade-2.jpg`,   `${M}/spells/enchant-jade-3.jpg`,
        `${M}/spells/enchant-sky-1.jpg`,    `${M}/spells/enchant-sky-2.jpg`,    `${M}/spells/enchant-sky-3.jpg`,
        `${M}/spells/enchant-royal-1.jpg`,  `${M}/spells/enchant-royal-2.jpg`,  `${M}/spells/enchant-royal-3.jpg`,
        `${M}/spells/heal-jade-1.jpg`,      `${M}/spells/heal-jade-2.jpg`,      `${M}/spells/heal-jade-3.jpg`,
        `${M}/spells/heal-royal-1.jpg`,     `${M}/spells/heal-royal-2.jpg`,     `${M}/spells/heal-royal-3.jpg`,
        `${M}/spells/heal-sky-1.jpg`,       `${M}/spells/heal-sky-2.jpg`,       `${M}/spells/heal-sky-3.jpg`,
        `${M}/spells/light-blue-1.jpg`,     `${M}/spells/light-blue-2.jpg`,     `${M}/spells/light-blue-3.jpg`,
        `${M}/spells/light-jade-1.jpg`,     `${M}/spells/light-jade-2.jpg`,     `${M}/spells/light-jade-3.jpg`,
        `${M}/spells/light-royal-1.jpg`,    `${M}/spells/light-royal-2.jpg`,    `${M}/spells/light-royal-3.jpg`,
        `${M}/spells/protect-blue-1.jpg`,   `${M}/spells/protect-blue-2.jpg`,   `${M}/spells/protect-blue-3.jpg`,
        `${M}/spells/haste-sky-1.jpg`,      `${M}/spells/haste-sky-2.jpg`,      `${M}/spells/haste-sky-3.jpg`,
        `${M}/spells/haste-royal-1.jpg`,    `${M}/spells/haste-royal-2.jpg`,    `${M}/spells/haste-royal-3.jpg`,
        `${M}/spells/link-blue-1.jpg`,      `${M}/spells/link-blue-2.jpg`,      `${M}/spells/link-blue-3.jpg`,
    ],
    "Genjutsu": [
        // illusions, horror, shadows, fog
        `${M}/spells/evil-eye-eerie-1.jpg`, `${M}/spells/evil-eye-eerie-2.jpg`, `${M}/spells/evil-eye-eerie-3.jpg`,
        `${M}/spells/evil-eye-red-1.jpg`,   `${M}/spells/evil-eye-red-2.jpg`,   `${M}/spells/evil-eye-red-3.jpg`,
        `${M}/spells/horror-eerie-1.jpg`,   `${M}/spells/horror-eerie-2.jpg`,   `${M}/spells/horror-eerie-3.jpg`,
        `${M}/spells/horror-red-1.jpg`,     `${M}/spells/horror-red-2.jpg`,     `${M}/spells/horror-red-3.jpg`,
        `${M}/spells/horror-acid-1.jpg`,    `${M}/spells/horror-acid-2.jpg`,    `${M}/spells/horror-acid-3.jpg`,
        `${M}/spells/fog-magenta-1.jpg`,    `${M}/spells/fog-magenta-2.jpg`,    `${M}/spells/fog-magenta-3.jpg`,
        `${M}/spells/fog-orange-1.jpg`,     `${M}/spells/fog-orange-2.jpg`,     `${M}/spells/fog-orange-3.jpg`,
        `${M}/spells/fog-blue-1.jpg`,       `${M}/spells/fog-blue-2.jpg`,       `${M}/spells/fog-blue-3.jpg`,
        `${M}/spells/wild-eerie-1.jpg`,     `${M}/spells/wild-eerie-2.jpg`,     `${M}/spells/wild-eerie-3.jpg`,
        `${M}/skills/shadow_01.jpg`,  `${M}/skills/shadow_02.jpg`,  `${M}/skills/shadow_03.jpg`,
        `${M}/skills/shadow_04.jpg`,  `${M}/skills/shadow_05.jpg`,  `${M}/skills/shadow_06.jpg`,
        `${M}/skills/shadow_07.jpg`,  `${M}/skills/shadow_08.jpg`,  `${M}/skills/shadow_09.jpg`,
        `${M}/skills/shadow_10.jpg`,  `${M}/skills/shadow_11.jpg`,  `${M}/skills/shadow_12.jpg`,
        `${M}/skills/violet_01.jpg`,  `${M}/skills/violet_03.jpg`,  `${M}/skills/violet_05.jpg`,
        `${M}/skills/violet_07.jpg`,  `${M}/skills/violet_09.jpg`,  `${M}/skills/violet_11.jpg`,
    ],
    "Fuinjutsu": [
        // runes, links, seals, shielding
        `${M}/spells/runes-blue-1.jpg`,     `${M}/spells/runes-blue-2.jpg`,     `${M}/spells/runes-blue-3.jpg`,
        `${M}/spells/runes-magenta-1.jpg`,  `${M}/spells/runes-magenta-2.jpg`,  `${M}/spells/runes-magenta-3.jpg`,
        `${M}/spells/runes-orange-1.jpg`,   `${M}/spells/runes-orange-2.jpg`,   `${M}/spells/runes-orange-3.jpg`,
        `${M}/spells/runes-royal-1.jpg`,    `${M}/spells/runes-royal-2.jpg`,    `${M}/spells/runes-royal-3.jpg`,
        `${M}/spells/link-blue-1.jpg`,      `${M}/spells/link-blue-2.jpg`,      `${M}/spells/link-blue-3.jpg`,
        `${M}/spells/link-eerie-1.jpg`,     `${M}/spells/link-eerie-2.jpg`,     `${M}/spells/link-eerie-3.jpg`,
        `${M}/spells/link-royal-1.jpg`,     `${M}/spells/link-royal-2.jpg`,     `${M}/spells/link-royal-3.jpg`,
        `${M}/spells/link-spirit-1.jpg`,    `${M}/spells/link-spirit-2.jpg`,    `${M}/spells/link-spirit-3.jpg`,
        `${M}/spells/shielding-acid-1.jpg`, `${M}/spells/shielding-acid-2.jpg`, `${M}/spells/shielding-acid-3.jpg`,
        `${M}/spells/shielding-eerie-1.jpg`,`${M}/spells/shielding-eerie-2.jpg`,`${M}/spells/shielding-eerie-3.jpg`,
        `${M}/spells/shielding-spirit-1.jpg`,`${M}/spells/shielding-spirit-2.jpg`,`${M}/spells/shielding-spirit-3.jpg`,
        `${M}/spells/protect-red-1.jpg`,    `${M}/spells/protect-red-2.jpg`,    `${M}/spells/protect-red-3.jpg`,
        `${M}/spells/protect-magenta-1.jpg`,`${M}/spells/protect-magenta-2.jpg`,`${M}/spells/protect-magenta-3.jpg`,
    ],
    "Hachimon Tonkou": [
        // extreme power, auras, fire haste
        `${M}/spells/haste-fire-1.jpg`,     `${M}/spells/haste-fire-2.jpg`,     `${M}/spells/haste-fire-3.jpg`,
        `${M}/spells/explosion-royal-1.jpg`,`${M}/spells/explosion-royal-2.jpg`,`${M}/spells/explosion-royal-3.jpg`,
        `${M}/spells/lighting-fire-1.jpg`,  `${M}/spells/lighting-fire-2.jpg`,  `${M}/spells/lighting-fire-3.jpg`,
        `${M}/spells/beam-magenta-1.jpg`,   `${M}/spells/beam-magenta-2.jpg`,   `${M}/spells/beam-magenta-3.jpg`,
        `${M}/spells/light-air-fire-1.jpg`, `${M}/spells/light-air-fire-2.jpg`, `${M}/spells/light-air-fire-3.jpg`,
    ],
    "Training": [
        // study, discipline, endurance feats
        `${M}/feats/skill-focus.jpg`,       `${M}/feats/iron-will.jpg`,
        `${M}/feats/toughness.jpg`,         `${M}/feats/endurance.png`,
        `${M}/feats/great-fortitude.jpg`,   `${M}/feats/lighting-reflexes.jpg`,
        `${M}/feats/improved-initiative.jpg`,`${M}/feats/alertness.jpg`,
        `${M}/feats/combat-casting.jpg`,    `${M}/feats/magical-aptitude.jpg`,
        `${M}/feats/self-suficient.jpg`,    `${M}/feats/persuasive.jpg`,
        `${M}/feats/diehard.jpg`,           `${M}/feats/improved-iron-will.jpg`,
        `${M}/feats/improved-great-fortitude.jpg`,
        `${M}/feats/improved-lighting-reflexes.jpg`,
    ],
};

function pickIcon(discipline, name) {
    const pool = DISC_ICON_POOLS[discipline] ?? DISC_ICON_POOLS["Ninjutsu"];
    return pool[hashName(name) % pool.length];
}

// ── Main ─────────────────────────────────────────────────────────────────────
mkdirSync(OUT, { recursive: true });

const source = JSON.parse(readFileSync(SRC, "utf8"));

const usedSlugs = new Map(); // slug → count
let converted = 0;
let skipped   = 0;

const stats = { complexityExact: 0, complexityFallback: 0, noDC: 0 };

for (const entry of source) {
    const naruto    = entry.flags?.naruto ?? {};
    const sys       = entry.system ?? {};
    const descHtml  = sys.description?.value ?? "";

    // Rank — coerce to int, clamp 1–15
    let rank = parseInt(naruto.rank, 10);
    if (!Number.isFinite(rank) || rank < 1) rank = 1;
    if (rank > 15) rank = 15;

    // Chakra cost — "*" or "" → 0
    let chakraCost = parseInt(naruto.chakraCost, 10);
    if (!Number.isFinite(chakraCost) || chakraCost < 0) chakraCost = 0;

    // Discipline / subtype
    const discipline = naruto.type ?? "Ninjutsu";
    const subtype    = (naruto.subtype === "*" || !naruto.subtype) ? "" : String(naruto.subtype);

    // Complexity
    const hasDC = DC_RE.test(descHtml) && SUCC_RE.test(descHtml);
    const complexity = resolveComplexity(rank, descHtml);
    if (!hasDC) {
        stats.noDC++;
    } else {
        const learnMod  = parseInt(DC_RE.exec(descHtml)[1], 10) - 10 - rank;
        const successes = parseInt(SUCC_RE.exec(descHtml)[1], 10);
        if (REVERSE.has(`${learnMod}:${successes}`)) stats.complexityExact++;
        else stats.complexityFallback++;
    }

    // Activation
    const activationRaw = sys.activation?.type ?? "standard";
    const activation = ["swift", "full", "standard"].includes(activationRaw) ? activationRaw : "standard";

    // Components
    const compFlags = parseComponents(sys.components?.value ?? "");

    // Icon — deterministic pick from per-discipline pool
    const img = pickIcon(discipline, entry.name);

    // Build the technique document
    const doc = {
        _id:    randomId(),
        name:   entry.name,
        type:   "naruto-d20.technique",
        img,
        _stats: {
            coreVersion:    "13.350",
            systemId:       "pf1",
            systemVersion:  "11.11",
            createdTime:    null,
            modifiedTime:   null,
            lastModifiedBy: null,
        },
        system: {
            description: {
                value:        descHtml,
                summary:      "",
                instructions: "",
            },
            discipline,
            subtype,
            rank,
            complexity,
            chakraCost,
            activation,
            range:    sys.range?.value    ?? "",
            target:   sys.target?.value   ?? "",
            area:     sys.area?.value     ?? "",
            duration: sys.duration?.value ?? "",
            save:     sys.save?.description ?? "",

            ...compFlags,

            isHijutsu:     false,
            isKinjutsu:    false,
            isCombination: false,
            performMiscBonus: 0,
            active:   false,
            changes:  [],
            actions:  [],
            scriptCalls: [],
            links:    { prerequisites: [], supplements: [], children: [] },
            tag:      "",
            tags:     [],
            flags:    { boolean: {}, dictionary: {} },
            showInQuickbar: false,
            showInCombat:   false,
        },
        effects:   [],
        folder:    null,
        sort:      0,
        ownership: { default: 0 },
        flags:     {},
    };

    // Generate unique slug for the filename
    const base = slug(entry.name);
    const count = usedSlugs.get(base) ?? 0;
    usedSlugs.set(base, count + 1);
    const filename = count === 0 ? `${base}.json` : `${base}-${count + 1}.json`;

    writeFileSync(join(OUT, filename), JSON.stringify(doc, null, 2) + "\n", "utf8");
    converted++;
}

console.log(`\nConverted ${converted} techniques → ${OUT}`);
console.log(`  Complexity: ${stats.complexityExact} exact, ${stats.complexityFallback} fallback, ${stats.noDC} no-DC (defaulted to E-Class)`);
console.log(`  Skipped: ${skipped}`);
console.log(`\nNext: npm run pack`);
