import { MODULE_ID } from "../constants.mjs";
import { rollHpCost, commitHpCost, applyHpCost } from "../data/hp-cost.mjs";
import {
  getMaintenanceBuffFlag,
  maintenanceBuffDuration,
  maintenanceFacets,
} from "./maintenance-buffs.mjs";
import { applyModeBuff, applyUpkeepBuff, promptModeChoice } from "./buff-application.mjs";
import { isRankMaintenanceBuff, maintainRankBuff } from "./rank-buff-maintenance.mjs";

const pending = new Set();

export function registerTurnMaintenance() {
  Hooks.on("updateItem", (item, changed, options, userId) => {
    if (userId !== game.user.id) return;
    if (options?.pf1?.reason !== "duration") return;
    if (changed?.system?.active !== false) return;
    if (item.type !== "buff") return;
    if (!item.flags?.[MODULE_ID]?.sourceId) return;

    const actor = item.actor;
    if (!actor?.isOwner) return;

    // Phase 1: rank cost resolution remains name-driven, but this engine owns
    // the only listener and dedup queue.
    if (isRankMaintenanceBuff(item)) {
      queueDeferred(item, () => maintainRankBuff(actor, item.id));
      return;
    }
    if (queueMaintenance(item)) return;

    // No maintenance descriptor → delete the spent buff (deferred past the
    // expiry transaction, then re-checked).
    const itemId = item.id;
    window.setTimeout(async () => {
      const current = actor.items.get(itemId);
      if (!current) return;
      try {
        await actor.deleteEmbeddedDocuments("Item", [itemId]);
      } catch (err) {
        if (actor.items.has(itemId)) {
          console.error(`naruto-d20 | failed to delete expired buff "${current.name}":`, err);
        }
      }
    }, 0);
  });
}

function queueMaintenance(item) {
  const flag = getMaintenanceBuffFlag(item);
  if (!flag?.sourceTechniqueId) return false;
  const actor = item.actor;
  const technique = actor.items.get(flag.sourceTechniqueId);
  if (!technique || !maintenanceFacets(technique)) {
    // Source gone or no longer maintained → fall through to generic delete.
    return false;
  }
  return queueDeferred(item, () => runMaintenance(actor, item.id));
}

function queueDeferred(item, run) {
  const actor = item.actor;
  const key = `${actor.uuid}:${item.id}`;
  if (pending.has(key)) return true;
  pending.add(key);
  window.setTimeout(async () => {
    try {
      await run();
    } finally {
      pending.delete(key);
    }
  }, 0);
  return true;
}

async function runMaintenance(actor, itemId) {
  const item = actor.items.get(itemId);
  if (!item || item.system?.active) return;

  const flag = getMaintenanceBuffFlag(item);
  const technique = flag?.sourceTechniqueId ? actor.items.get(flag.sourceTechniqueId) : null;
  if (!technique) return deleteMaintenanceBuff(actor, itemId);

  const facets = maintenanceFacets(technique);
  if (!facets) return deleteMaintenanceBuff(actor, itemId);

  // Cost facet. HP only in Phase 1 (chakra-cost ranks go through the rank handler).
  if (facets.resource === "hp") {
    return maintainHpUpkeep(actor, itemId, technique, facets, flag);
  }

  // No-cost choice (Champuru), or a maintained buff with no cost/choice.
  await completeMaintenance(actor, itemId, technique, facets, flag);
}

async function maintainHpUpkeep(actor, itemId, technique, facets, flag) {
  const formula = facets.cost || "0";

  if (facets.policy === "forced") {
    const { roll, amount } = await rollHpCost(actor, formula);
    const hp = Number(actor.system?.attributes?.hp?.value ?? 0) || 0;
    if (hp - amount < 1) {
      await deleteMaintenanceBuff(actor, itemId);
      ui.notifications.info(
        game.i18n.format("NarutoD20.Maintenance.UpkeepEnded", { name: technique.name }),
      );
      return;
    }
    await commitHpCost(actor, roll, amount);
    await completeMaintenance(actor, itemId, technique, facets, flag);
    return;
  }

  // policy "prompt" with optional step waiver.
  if (facets.waiver === "step") {
    const mastery = Number(technique.system?.mastery ?? 0) || 0;
    if (mastery >= facets.waiverStep) {
      await completeMaintenance(actor, itemId, technique, facets, flag);
      return;
    }
  }

  const choice = await promptHpUpkeep(technique, formula);
  if (choice !== "pay") return deleteMaintenanceBuff(actor, itemId);
  await applyHpCost(actor, formula);
  await completeMaintenance(actor, itemId, technique, facets, flag);
}

async function completeMaintenance(
  actor,
  itemId,
  technique,
  facets,
  flag,
  interval = facets.interval,
) {
  if (facets.choice === "mode") {
    const choice = await promptModeChoice(technique, {
      current: flag.modeId,
      allowBreak: true,
    });
    if (!choice || choice === "break") {
      await deleteMaintenanceBuff(actor, itemId);
      return;
    }
    await applyModeBuff(technique, actor, choice, interval);
    return;
  }

  if (facets.resource === "hp" || technique.system?.automation?.maintenance?.element) {
    await applyUpkeepBuff(technique, actor, interval);
    return;
  }

  await refreshMaintenanceBuff(actor, itemId, interval);
}

function promptHpUpkeep(technique, formula) {
  return new Promise((resolve) => {
    let done = false;
    const finish = (v) => {
      if (!done) {
        done = true;
        resolve(v);
      }
    };
    new Dialog({
      title: game.i18n.format("NarutoD20.Maintenance.UpkeepTitle", { name: technique.name }),
      content: `<p>${game.i18n.format("NarutoD20.Maintenance.UpkeepMessage", {
        name: technique.name,
        formula,
      })}</p>`,
      buttons: {
        pay: {
          icon: '<i class="fas fa-heart-broken"></i>',
          label: game.i18n.format("NarutoD20.Maintenance.PayHp", { formula }),
          callback: () => finish("pay"),
        },
        break: {
          icon: '<i class="fas fa-times"></i>',
          label: game.i18n.localize("NarutoD20.Maintenance.Break"),
          callback: () => finish("break"),
        },
      },
      default: "pay",
      close: () => finish("break"),
    }).render(true);
  });
}

export async function refreshMaintenanceBuff(actor, itemId, interval) {
  const current = actor.items.get(itemId);
  if (!current) return;
  const d = maintenanceBuffDuration(interval);
  await current.update({
    "system.active": true,
    "system.duration.units": d.units,
    "system.duration.value": d.value,
    "system.duration.end": d.end,
    "system.duration.start": d.start,
  });
}

async function deleteMaintenanceBuff(actor, itemId) {
  if (!actor.items.has(itemId)) return;
  try {
    await actor.deleteEmbeddedDocuments("Item", [itemId]);
  } catch (err) {
    if (actor.items.has(itemId)) {
      console.error(`naruto-d20 | failed to delete maintenance buff "${itemId}":`, err);
    }
  }
}
