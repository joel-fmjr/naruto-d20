import assert from "node:assert/strict";
import { describe, it } from "node:test";

globalThis.Hooks ??= { once() {}, on() {}, off() {}, callAll() {} };
globalThis.game ??= {
  i18n: {
    format: (_key, data = {}) => data.name ?? "",
    localize: (key) => key,
  },
};
globalThis.ui ??= { notifications: { warn() {} } };
globalThis.pf1 ??= { documents: { item: { ItemPF: class {} } } };

const { NATIVE_TECHNIQUE_USE_OPTION, TECHNIQUE_ITEM_TYPE } = await import(
  "../scripts/core/constants.mjs"
);
const {
  installTechniqueUseRoutingPatch,
  resolveTechniqueUseActionId,
  routeTechniqueItemUse,
} = await import("../scripts/features/techniques/use-routing.mjs");

function action(id) {
  return { id };
}

function techniqueItem(actions, extra = {}) {
  const map = new Map(actions.map((a) => [a.id, a]));
  return {
    type: TECHNIQUE_ITEM_TYPE,
    actions: map,
    system: { actions },
    defaultAction: extra.defaultAction,
    ...extra,
  };
}

describe("resolveTechniqueUseActionId", () => {
  it("keeps a valid requested action id", () => {
    const item = techniqueItem([action("first"), action("second")]);
    assert.equal(resolveTechniqueUseActionId(item, "second"), "second");
  });

  it("falls back to the default action id", () => {
    const item = techniqueItem([action("first")], { defaultAction: action("default") });
    assert.equal(resolveTechniqueUseActionId(item, ""), "default");
  });

  it("falls back to the first action id", () => {
    const item = techniqueItem([action("first"), action("second")]);
    assert.equal(resolveTechniqueUseActionId(item, ""), "first");
  });

  it("returns an empty string when no action exists", () => {
    const item = techniqueItem([]);
    assert.equal(resolveTechniqueUseActionId(item, ""), "");
  });
});

describe("routeTechniqueItemUse", () => {
  it("routes technique item use into performTechnique", async () => {
    const item = techniqueItem([action("first")]);
    const calls = [];

    const result = await routeTechniqueItemUse(
      item,
      { ev: "event", token: "token" },
      async function nativeUse() {
        calls.push(["native"]);
        return "native";
      },
      async (performedItem, actionId, event, context) => {
        calls.push(["perform", performedItem, actionId, event, context]);
        return "performed";
      },
    );

    assert.equal(result, "performed");
    assert.equal(calls.length, 1);
    assert.equal(calls[0][0], "perform");
    assert.equal(calls[0][1], item);
    assert.equal(calls[0][2], "first");
    assert.equal(calls[0][3], "event");
    assert.deepEqual(calls[0][4], { token: "token" });
  });

  it("passes null token context when no token option was provided", async () => {
    const item = techniqueItem([action("first")]);
    const result = await routeTechniqueItemUse(
      item,
      { ev: "event" },
      async () => "native",
      async (_item, _actionId, _event, context) => context,
    );

    assert.deepEqual(result, { token: null });
  });

  it("passes non-technique item use through to native PF1e use", async () => {
    const item = { type: "weapon" };
    const result = await routeTechniqueItemUse(
      item,
      { actionId: "attack" },
      async function nativeUse(options) {
        assert.equal(this, item);
        assert.deepEqual(options, { actionId: "attack" });
        return "native";
      },
      async () => {
        throw new Error("performTechnique should not run");
      },
    );

    assert.equal(result, "native");
  });

  it("passes bypassed technique item use through to native PF1e use", async () => {
    const item = techniqueItem([action("first")]);
    const options = { actionId: "first", [NATIVE_TECHNIQUE_USE_OPTION]: true };

    const result = await routeTechniqueItemUse(
      item,
      options,
      async function nativeUse(received) {
        assert.equal(this, item);
        assert.equal(received, options);
        return "native";
      },
      async () => {
        throw new Error("performTechnique should not run");
      },
    );

    assert.equal(result, "native");
  });

  it("falls through to native PF1e use when a technique has no usable action", async () => {
    const item = techniqueItem([]);
    const result = await routeTechniqueItemUse(
      item,
      {},
      async function nativeUse(options) {
        assert.equal(this, item);
        assert.deepEqual(options, {});
        return "native";
      },
      async () => {
        throw new Error("performTechnique should not run without an action");
      },
    );

    assert.equal(result, "native");
  });
});

describe("installTechniqueUseRoutingPatch", () => {
  it("patches ItemPF.use once", () => {
    class ItemPF {
      async use(options) {
        return ["native", this.type, options?.actionId ?? ""];
      }
    }

    const localPf1 = { documents: { item: { ItemPF } } };
    const first = installTechniqueUseRoutingPatch({ pf1Ref: localPf1 });
    const second = installTechniqueUseRoutingPatch({ pf1Ref: localPf1 });

    assert.equal(first, true);
    assert.equal(second, false);
  });
});
