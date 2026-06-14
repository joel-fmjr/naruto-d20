import { MODULE_ID } from "../constants.mjs";
import { chakraPoolTempPath, chakraPoolValuePath } from "../flag-paths.mjs";
import { checkAndUpdateConditions } from "./chakra-conditions.mjs";

/**
 * Resolve Chakra Damage against an actor's pool. Damage is absorbed by temp
 * chakra first, then the pool (both floored at 0). Any portion the pool cannot
 * absorb is doubled and dealt as HP damage (per the Chakra Damage rule). The
 * reserve is never touched and the deliberate-spend "emergency transfer" never
 * fires — damage is not a spend. Pure: returns new values, writes nothing.
 *
 * @returns {{temp:number, pool:number, absorbed:number, hpOverflow:number}}
 */
export function calculateChakraDamage(actor, amount) {
  const dmg = Math.max(0, Number(amount) || 0);
  const chakra = actor?.flags?.[MODULE_ID]?.chakra ?? {};
  const tempValue = Math.max(0, Number(chakra.pool?.temp ?? 0) || 0);
  const poolValue = Math.max(0, Number(chakra.pool?.value ?? 0) || 0);

  const fromTemp = Math.min(dmg, tempValue);
  const fromPool = Math.min(dmg - fromTemp, poolValue);
  const absorbed = fromTemp + fromPool;
  const hpOverflow = (dmg - absorbed) * 2;

  return {
    temp: tempValue - fromTemp,
    pool: poolValue - fromPool,
    absorbed,
    hpOverflow,
  };
}
