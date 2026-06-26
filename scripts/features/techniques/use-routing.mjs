import { NATIVE_TECHNIQUE_USE_OPTION, TECHNIQUE_ITEM_TYPE } from "../../core/constants.mjs";
import { performTechnique } from "./use.mjs";

const PATCH_KEY = Symbol.for("naruto-d20.techniqueUseRoutingPatched");

export function resolveTechniqueUseActionId(item, requestedActionId = "") {
  if (requestedActionId && item.actions?.get?.(requestedActionId)) return requestedActionId;
  if (item.defaultAction?.id) return item.defaultAction.id;
  return Array.from(item.actions?.values?.() ?? item.actions ?? [])[0]?.id ?? "";
}

export async function routeTechniqueItemUse(
  item,
  options = {},
  nativeUse,
  perform = performTechnique,
) {
  if (item?.type !== TECHNIQUE_ITEM_TYPE || options?.[NATIVE_TECHNIQUE_USE_OPTION] === true) {
    return nativeUse.call(item, options);
  }

  const actionId = resolveTechniqueUseActionId(item, options.actionId);
  if (!actionId) return nativeUse.call(item, options);

  return perform(item, actionId, options.ev ?? null, { token: options.token ?? null });
}

export function installTechniqueUseRoutingPatch({ pf1Ref = globalThis.pf1 } = {}) {
  const ItemPF = pf1Ref?.documents?.item?.ItemPF;
  if (!ItemPF?.prototype?.use || ItemPF.prototype[PATCH_KEY]) return false;

  const nativeUse = ItemPF.prototype.use;
  ItemPF.prototype.use = function narutoTechniqueUseRouting(options = {}) {
    return routeTechniqueItemUse(this, options, nativeUse);
  };

  Object.defineProperty(ItemPF.prototype, PATCH_KEY, {
    value: true,
    configurable: false,
  });

  return true;
}
