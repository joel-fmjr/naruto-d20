import { onActorRest } from "../features/chakra/rest-recovery.mjs";

export function registerRestHook() {
  Hooks.on("pf1ActorRest", (actor, options) => {
    onActorRest(actor, options);
  });
}
