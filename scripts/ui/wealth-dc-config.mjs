import { MODULE_ID } from "../core/constants.mjs";
import { wealthDcPath } from "../core/flag-paths.mjs";

const TEMPLATE = `modules/${MODULE_ID}/templates/item/wealth-dc-config.hbs`;

const WEALTH_DC_ITEM_TYPES = ["weapon", "equipment", "loot", "consumable", "container", "implant"];

/**
 * Inject a "Wealth DC" field into PF1e item sheets for physical/purchasable
 * item types. narutod20 is modern-d20-based: items don't carry a specific
 * gp price, just a DC to roll/compare against the actor's Wealth hero stat.
 */
export function registerWealthDcConfig() {
  Hooks.on("renderItemSheetPF", onRenderItemSheet);
}

async function onRenderItemSheet(app, html) {
  const item = app.item;
  if (!WEALTH_DC_ITEM_TYPES.includes(item?.type)) return;
  if (html.find(".naruto-wealth-dc").length) return;

  // Direct child, not `.find` — container.hbs has a second, unrelated <header>
  // inside its Contents tab.
  const anchor = html.find("section.sidebar > header").first();
  if (!anchor.length) return;

  const rendered = await foundry.applications.handlebars.renderTemplate(TEMPLATE, {
    flagPath: wealthDcPath,
    value: foundry.utils.getProperty(item, wealthDcPath) ?? "",
    editable: app.isEditable,
  });

  anchor.after(rendered);
}
