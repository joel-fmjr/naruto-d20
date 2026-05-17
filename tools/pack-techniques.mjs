/**
 * Compiles packs/_source/techniques/*.json → packs/techniques/ (ClassicLevel)
 *
 * Builds a 3-level compendium folder hierarchy: Discipline → Subtype → Rank
 *
 * Uses raw !items!<id> / !folders!<id> keys on the parent DB to avoid
 * classic-level sublevel API differences between node_modules (v1.4.1) and
 * the version Foundry uses internally (v2.0.0).
 *
 * Run with: node tools/pack-techniques.mjs
 */

import { readFileSync, readdirSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { ClassicLevel } = require("classic-level");

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT  = join(__dir, "..");
const SRC   = join(ROOT, "packs/_source/techniques");
const OUT   = join(ROOT, "packs/techniques");

mkdirSync(OUT, { recursive: true });

// ── Ordering ─────────────────────────────────────────────────────────────────

const DISCIPLINE_ORDER = [
    "Ninjutsu", "Genjutsu", "Taijutsu", "Chakra Control",
    "Fuinjutsu", "Hachimon Tonkou", "Training",
];

// Rank numerals 1–15, sorted ascending.
const RANK_ORDER = Array.from({ length: 15 }, (_, i) => String(i + 1).padStart(2, "0"));

// ── Deterministic base62 ID from a string ────────────────────────────────────

const ID_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

function deterministicId(str) {
    // FNV-1a 32-bit hash, then LCG-expand to 16 base62 chars.
    let h = 0x811c9dc5 >>> 0;
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h  = Math.imul(h, 0x01000193) >>> 0;
    }
    let result = "";
    let seed = h;
    for (let i = 0; i < 16; i++) {
        seed   = (Math.imul(seed, 0x6c62272e) + 0x07bb0142) >>> 0;
        result += ID_CHARS[seed % 62];
    }
    return result;
}

const STATS = {
    coreVersion: "13.350", systemId: "pf1", systemVersion: "11.11",
    createdTime: null, modifiedTime: null, lastModifiedBy: null,
};

// ── Read source items ─────────────────────────────────────────────────────────

const files = readdirSync(SRC).filter(f => f.endsWith(".json"));
const items = files.map(f => JSON.parse(readFileSync(join(SRC, f), "utf8")));

// ── Build folder hierarchy ────────────────────────────────────────────────────

// Collect unique subtypes and ranks per path.
const subtypesByDisc = new Map();   // discipline → Set<subtype>
const ranksByPath    = new Map();   // "disc::sub" → Set<rank>

for (const doc of items) {
    const disc = doc.system.discipline ?? "Ninjutsu";
    const sub  = doc.system.subtype    || "General";
    const rank = String(doc.system.rank ?? 1).padStart(2, "0");

    if (!subtypesByDisc.has(disc)) subtypesByDisc.set(disc, new Set());
    subtypesByDisc.get(disc).add(sub);

    const pathKey = `${disc}::${sub}`;
    if (!ranksByPath.has(pathKey)) ranksByPath.set(pathKey, new Set());
    ranksByPath.get(pathKey).add(rank);
}

// Build folder documents and ID lookup map.
const folderId   = new Map();   // lookup-key → _id
const folderDocs = [];

for (let di = 0; di < DISCIPLINE_ORDER.length; di++) {
    const disc = DISCIPLINE_ORDER[di];
    if (!subtypesByDisc.has(disc)) continue;

    const discId = deterministicId(`disc::${disc}`);
    folderId.set(`disc::${disc}`, discId);
    folderDocs.push({
        _id: discId, name: disc, type: "Item",
        description: "", folder: null,
        sorting: "a", color: null, sort: di * 1000,
        _stats: STATS,
    });

    // Subtypes: alphabetical, "General" (no subtype) last.
    const subtypes = [...subtypesByDisc.get(disc)].sort((a, b) => {
        if (a === "General") return 1;
        if (b === "General") return -1;
        return a.localeCompare(b);
    });

    for (let si = 0; si < subtypes.length; si++) {
        const sub   = subtypes[si];
        const subId = deterministicId(`sub::${disc}::${sub}`);
        folderId.set(`sub::${disc}::${sub}`, subId);
        folderDocs.push({
            _id: subId, name: sub, type: "Item",
            description: "", folder: discId,
            sorting: "a", color: null, sort: si * 1000,
            _stats: STATS,
        });

        // Ranks: ordered numerically low → high.
        const pathKey = `${disc}::${sub}`;
        const ranks = [...ranksByPath.get(pathKey)].sort(
            (a, b) => Number(a) - Number(b)
        );

        for (let ri = 0; ri < ranks.length; ri++) {
            const rank   = ranks[ri];
            const rankId = deterministicId(`rank::${disc}::${sub}::${rank}`);
            folderId.set(`rank::${disc}::${sub}::${rank}`, rankId);
            folderDocs.push({
                _id: rankId, name: rank, type: "Item",
                description: "", folder: subId,
                sorting: "a", color: null, sort: ri * 1000,
                _stats: STATS,
            });
        }
    }
}

// ── Open DB ───────────────────────────────────────────────────────────────────

const db = new ClassicLevel(OUT, { keyEncoding: "utf8", valueEncoding: "json" });
await db.open();

// Clear existing items and folders.
const existingItemKeys   = await db.keys({ gte: "!items!\x00",   lte: "!items!\xFF"   }).all();
const existingFolderKeys = await db.keys({ gte: "!folders!\x00", lte: "!folders!\xFF" }).all();
const totalExisting = existingItemKeys.length + existingFolderKeys.length;
if (totalExisting > 0) {
    const clearBatch = db.batch();
    for (const key of existingItemKeys)   clearBatch.del(key);
    for (const key of existingFolderKeys) clearBatch.del(key);
    await clearBatch.write();
    console.log(`Cleared ${totalExisting} existing entries.`);
}

console.log(`Packing ${items.length} items + ${folderDocs.length} folders → ${OUT}`);

const batch = db.batch();

// Write folders.
for (const folder of folderDocs) {
    batch.put(`!folders!${folder._id}`, folder);
}

// Write items, assigning each to its rank folder.
for (const doc of items) {
    const disc = doc.system.discipline ?? "Ninjutsu";
    const sub  = doc.system.subtype    || "General";
    const rank = String(doc.system.rank ?? 1).padStart(2, "0");
    doc.folder = folderId.get(`rank::${disc}::${sub}::${rank}`) ?? null;
    batch.put(`!items!${doc._id}`, doc);
}

await batch.write();
await db.close();

console.log(`Done. ${items.length} items + ${folderDocs.length} folders written.`);
