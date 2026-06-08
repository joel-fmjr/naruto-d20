/**
 * Sync Naruto d20 technique activation types from the external source DB.
 *
 * Usage: node tools/sync-technique-activation-from-db.mjs [--dry-run] [--source <dir>]
 */

import { readFileSync, readdirSync, writeFileSync } from "fs";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const SRC_DIR = join(ROOT, "packs/_source/techniques");
const DEFAULT_DB_DIR = "/home/joelfmjr/projetos/naruto/narutod20_db/data_sources/json/techniques";

const DRY_RUN = process.argv.includes("--dry-run");

function getArgValue(name, fallback) {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  return process.argv[index + 1] || fallback;
}

const DB_DIR = resolve(getArgValue("--source", DEFAULT_DB_DIR));

const ACTIVATION_MAP = {
  attack: { type: "attack", unchained: { type: "action", cost: 1 } },
  move: { type: "move", unchained: { type: "action", cost: 1 } },
  swift: { type: "swift", unchained: { type: "action", cost: 1 } },
  full: { type: "full", unchained: { type: "action", cost: 3 } },
  immediate: { type: "immediate", unchained: { type: "reaction", cost: 0 } },
};

function timedActivation(type, cost) {
  return { type, cost, unchained: { type, cost } };
}

function normalizeTime(raw) {
  return String(raw ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\s*\*+\s*$/g, "")
    .trim()
    .toLowerCase();
}

function parseActivation(raw) {
  const normalized = normalizeTime(raw);
  if (!normalized) return { kind: "blank" };

  if (normalized === "attack actionn")
    return { kind: "mapped", system: "attack", action: ACTIVATION_MAP.attack };
  if (normalized === "attack action" || normalized === "1 attack action") {
    return { kind: "mapped", system: "attack", action: ACTIVATION_MAP.attack };
  }
  if (
    normalized === "move action" ||
    normalized === "move action or one round" ||
    normalized === "move or instant action"
  ) {
    return { kind: "mapped", system: "move", action: ACTIVATION_MAP.move };
  }
  if (normalized === "swift action" || normalized === "swift or instant action") {
    return { kind: "mapped", system: "swift", action: ACTIVATION_MAP.swift };
  }
  if (normalized === "full-round action" || normalized === "full-round or instant action") {
    return { kind: "mapped", system: "full", action: ACTIVATION_MAP.full };
  }
  if (normalized === "instant action") {
    return { kind: "mapped", system: "immediate", action: ACTIVATION_MAP.immediate };
  }
  if (normalized === "attack or instant action" || normalized === "attack or swift action") {
    return { kind: "mapped", system: "attack", action: ACTIVATION_MAP.attack };
  }

  if (
    normalized === "one round" ||
    normalized === "1 one round" ||
    normalized === "one round or 1 minute" ||
    normalized === "one round, 10m or 20m"
  ) {
    return { kind: "mapped", system: "round", action: timedActivation("round", 1) };
  }

  const rounds = normalized.match(/^(\d+)\s*(?:r|rounds?)$/);
  if (rounds) {
    return { kind: "mapped", system: "round", action: timedActivation("round", Number(rounds[1])) };
  }

  const minutes = normalized.match(/^(\d+)\s*(?:m|minutes?)$/);
  if (minutes) {
    return {
      kind: "mapped",
      system: "minute",
      action: timedActivation("minute", Number(minutes[1])),
    };
  }

  const hours = normalized.match(/^(\d+)\s*hours?$/);
  if (hours) {
    return { kind: "mapped", system: "hour", action: timedActivation("hour", Number(hours[1])) };
  }

  return { kind: "unknown", normalized };
}

function getJsonFiles(dir) {
  return readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) => {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) return getJsonFiles(path);
      return entry.isFile() && entry.name.endsWith(".json") ? [path] : [];
    })
    .sort();
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function collectExternalTechniques() {
  const byName = new Map();
  const duplicateNames = new Set();

  for (const path of getJsonFiles(DB_DIR)) {
    const json = readJson(path);
    const records = Array.isArray(json) ? json : [json];

    for (const record of records) {
      if (!record || typeof record !== "object" || typeof record.name !== "string") continue;
      if (byName.has(record.name)) duplicateNames.add(record.name);
      byName.set(record.name, { path, record });
    }
  }

  return { byName, duplicateNames };
}

function sameActivation(a, b) {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

const external = collectExternalTechniques();
const externalNames = new Set(external.byName.keys());
const matchedExternalNames = new Set();

const summary = {
  moduleTechniques: 0,
  matched: 0,
  changed: 0,
  unchanged: 0,
  blankTime: 0,
  missingActions: 0,
};

const unmatchedModule = [];
const unknownTimes = [];
const changedDocs = [];

for (const filename of readdirSync(SRC_DIR)
  .filter((f) => f.endsWith(".json"))
  .sort()) {
  const path = join(SRC_DIR, filename);
  const doc = readJson(path);
  if (doc.type !== "naruto-d20.technique") continue;

  summary.moduleTechniques++;
  const externalEntry = external.byName.get(doc.name);
  if (!externalEntry) {
    unmatchedModule.push(doc.name);
    continue;
  }

  summary.matched++;
  matchedExternalNames.add(doc.name);

  const parsed = parseActivation(externalEntry.record.time);
  if (parsed.kind === "blank") {
    summary.blankTime++;
    continue;
  }
  if (parsed.kind === "unknown") {
    unknownTimes.push({
      name: doc.name,
      time: externalEntry.record.time,
      normalized: parsed.normalized,
    });
    continue;
  }

  const actions = doc.system?.actions;
  if (!Array.isArray(actions) || actions.length === 0) summary.missingActions++;

  let changed = false;
  if (doc.system.activation !== parsed.system) {
    doc.system.activation = parsed.system;
    changed = true;
  }

  if (Array.isArray(actions)) {
    for (const action of actions) {
      if (!action || typeof action !== "object") continue;
      if (sameActivation(action.activation, parsed.action)) continue;
      action.activation = structuredClone(parsed.action);
      changed = true;
    }
  }

  if (!changed) {
    summary.unchanged++;
    continue;
  }

  summary.changed++;
  changedDocs.push({
    name: doc.name,
    filename,
    time: externalEntry.record.time,
    activation: parsed.system,
  });

  if (!DRY_RUN) {
    writeFileSync(path, JSON.stringify(doc, null, 2) + "\n", "utf8");
  }
}

const unmatchedExternal = [...externalNames]
  .filter((name) => !matchedExternalNames.has(name))
  .sort();

for (const change of changedDocs) {
  console.log(
    `${DRY_RUN ? "[dry-run] " : ""}${change.name} (${change.filename}): ${change.time || "(blank)"} -> ${change.activation}`,
  );
}

console.log("\nDone.");
console.log(`  External source: ${DB_DIR}`);
console.log(`  Module techniques scanned: ${summary.moduleTechniques}`);
console.log(`  External techniques indexed: ${external.byName.size}`);
console.log(`  Matched by name: ${summary.matched}`);
console.log(`  Changed: ${summary.changed}${DRY_RUN ? " (dry-run, not written)" : ""}`);
console.log(`  Unchanged: ${summary.unchanged}`);
console.log(`  Blank external time preserved: ${summary.blankTime}`);
console.log(`  Missing actions: ${summary.missingActions}`);
console.log(`  Unmatched module techniques: ${unmatchedModule.length}`);
console.log(`  Unmatched external techniques: ${unmatchedExternal.length}`);
console.log(`  Duplicate external names: ${external.duplicateNames.size}`);
console.log(`  Unknown time values: ${unknownTimes.length}`);

if (unmatchedModule.length) {
  console.log("\nUnmatched module techniques:");
  for (const name of unmatchedModule) console.log(`  - ${name}`);
}

if (unmatchedExternal.length) {
  console.log("\nUnmatched external techniques:");
  for (const name of unmatchedExternal) console.log(`  - ${name}`);
}

if (external.duplicateNames.size) {
  console.log("\nDuplicate external names:");
  for (const name of [...external.duplicateNames].sort()) console.log(`  - ${name}`);
}

if (unknownTimes.length) {
  console.log("\nUnknown time values:");
  for (const entry of unknownTimes) {
    console.log(
      `  - ${entry.name}: ${JSON.stringify(entry.time)} (normalized: ${entry.normalized})`,
    );
  }
  process.exitCode = 1;
}
