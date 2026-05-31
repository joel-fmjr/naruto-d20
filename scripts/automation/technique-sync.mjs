import { MODULE_ID, TECHNIQUE_ITEM_TYPE } from "../constants.mjs";
import { normalizeActionIds } from "../data/action-ids.mjs";

/**
 * Technique "medkit" core — detection & sync (no UI).
 *
 * Techniques are copied onto actors as embedded items at drop time; they keep no
 * live link to the compendium. This module re-establishes the link on demand:
 * it matches each embedded technique to its compendium counterpart and reports
 * whether the stored data still matches.
 *
 * Detection strategy: CONTENT DIFF (deep-equal of normalized `system` data).
 * No version field is required on the technique, so any edit you make in the
 * compendium is detected automatically with zero per-technique maintenance.
 * See docs/technique-medkit.md for the alternatives (version flag / indexed hash)
 * and how to migrate to them later.
 *
 * Cost: runs only on a button click, only over the techniques of ONE actor
 * (~10-50, never the whole 1.3k-item pack). Source docs are batch-loaded in a
 * single query; the comparison itself (foundry.utils.objectsEqual) is sub-ms.
 */

export const STATUS = {
    UP_TO_DATE:  "up-to-date",
    OUT_OF_DATE: "out-of-date",
    ORPHAN:      "orphan", // no counterpart in the compendium — cannot be synced
};

export function getTechniqueCompendium() {
    return game.packs.get(`${MODULE_ID}.techniques`);
}

function embeddedTechniques(actor) {
    return actor?.items?.filter((i) => i.type === TECHNIQUE_ITEM_TYPE) ?? [];
}

/**
 * Pull the source document `_id` out of an embedded item's compendiumSource,
 * but only when it points at `pack`. Foundry v13 sets `_stats.compendiumSource`
 * (older items used `flags.core.sourceId`) to `Compendium.<packId>.Item.<id>`
 * when a compendium item is dragged onto an actor. Zero-cost, exact.
 */
function sourceIdFromCompendiumSource(item, pack) {
    const cs = item._stats?.compendiumSource ?? item.flags?.core?.sourceId;
    if (typeof cs !== "string") return null;
    const prefix = `Compendium.${pack.collection}.Item.`;
    return cs.startsWith(prefix) ? cs.slice(prefix.length) : null;
}

/**
 * Map each embedded technique → its compendium source `_id`.
 * Primary key: compendiumSource (when present and still valid). Fallback: exact
 * name match against the pack index. Returns null for techniques with no match.
 *
 * @returns {Map<string, string|null>} embedded item id → source `_id` (or null)
 */
function resolveMatches(actor, pack, index) {
    const byName = new Map();
    const indexIds = new Set();
    for (const entry of index) {
        indexIds.add(entry._id);
        if (!byName.has(entry.name)) byName.set(entry.name, entry._id);
    }

    const matches = new Map();
    for (const item of embeddedTechniques(actor)) {
        let sourceId = sourceIdFromCompendiumSource(item, pack);
        // Stale link (source deleted/renamed in the pack) → fall back to name.
        if (sourceId && !indexIds.has(sourceId)) sourceId = null;
        if (!sourceId) sourceId = byName.get(item.name) ?? null;
        matches.set(item.id, sourceId);
    }
    return matches;
}

/** Recursively drop every `_id` key — identifiers are not semantic content. */
function stripIds(value) {
    if (Array.isArray(value)) return value.map(stripIds);
    if (value && typeof value === "object") {
        const out = {};
        for (const [k, v] of Object.entries(value)) {
            if (k === "_id") continue;
            out[k] = stripIds(v);
        }
        return out;
    }
    return value;
}

/**
 * Normalize a `system` object for comparison. `_id`s inside actions/changes/links
 * are randomized on import and carry no meaning, so they are stripped before diff.
 * Callers should pass `item.system.toObject()` so both sides go through the same
 * DataModel schema (defaults filled identically — no spurious field diffs).
 */
export function normalizeSystem(system) {
    return stripIds(system);
}

/** True when the embedded technique's stored data already matches the source. */
export function diffTechnique(embeddedSystem, sourceSystem) {
    return foundry.utils.objectsEqual(normalizeSystem(embeddedSystem), normalizeSystem(sourceSystem));
}

function describe(item, status) {
    return {
        id:         item.id,
        name:       item.name,
        img:        item.img,
        rank:       item.system?.rank ?? null,
        discipline: item.system?.discipline ?? "",
        status,
    };
}

/**
 * Classify every embedded technique on `actor` as up-to-date / out-of-date / orphan.
 * @returns {Promise<Array<{id,name,img,rank,discipline,status}>>}
 */
export async function analyzeActor(actor) {
    const techniques = embeddedTechniques(actor);
    const pack = getTechniqueCompendium();
    if (!pack || !techniques.length) {
        return techniques.map((it) => describe(it, STATUS.ORPHAN));
    }

    const index = await pack.getIndex();
    const matches = resolveMatches(actor, pack, index);

    const sourceIds = [...new Set([...matches.values()].filter(Boolean))];
    const docs = sourceIds.length ? await pack.getDocuments({ _id__in: sourceIds }) : [];
    const docById = new Map(docs.map((d) => [d.id, d]));

    return techniques.map((item) => {
        const sourceDoc = docById.get(matches.get(item.id));
        if (!sourceDoc) return describe(item, STATUS.ORPHAN);
        const same = diffTechnique(item.system.toObject(), sourceDoc.system.toObject());
        return describe(item, same ? STATUS.UP_TO_DATE : STATUS.OUT_OF_DATE);
    });
}

/**
 * Overwrite an embedded technique's data with the compendium source, preserving
 * the embedded item's own `_id` and flags (mirrors chris-premades'
 * `ItemMedkit.update` with `{diff:false}`). Action `_id`s are re-normalized.
 */
export async function syncTechnique(item, sourceDoc) {
    const src = sourceDoc.toObject();
    const { actions, changed } = normalizeActionIds(src.system?.actions);
    if (changed) src.system.actions = actions;
    await item.update(
        { name: src.name, img: src.img, system: src.system },
        { diff: false, recursive: false },
    );
}

/**
 * Re-sync the selected embedded techniques (by item id) from the compendium.
 * Recomputes matches (cheap) and batch-loads only the needed source docs.
 * @returns {Promise<number>} number of techniques actually updated
 */
export async function syncSelected(actor, itemIds) {
    const pack = getTechniqueCompendium();
    if (!pack) return 0;

    const index = await pack.getIndex();
    const matches = resolveMatches(actor, pack, index);

    const wanted = itemIds.filter((id) => matches.get(id));
    const sourceIds = [...new Set(wanted.map((id) => matches.get(id)))];
    if (!sourceIds.length) return 0;

    const docs = await pack.getDocuments({ _id__in: sourceIds });
    const docById = new Map(docs.map((d) => [d.id, d]));

    let count = 0;
    for (const id of wanted) {
        const item = actor.items.get(id);
        const sourceDoc = docById.get(matches.get(id));
        if (!item || !sourceDoc) continue;
        await syncTechnique(item, sourceDoc);
        count++;
    }
    return count;
}
