# Chakra Conditions

## Goal

Automatically apply deteriorating conditions to an actor based on their Chakra Reserve level, giving mechanical consequences to running low on chakra beyond just "not being able to cast techniques."

## Rules

| Reserve State | Naruto Condition | Implied PF1e Condition |
|---|---|---|
| `0 < reserve / max < 50%` | **Low Reserves** | `fatigued` |
| `reserve == 0` | **Chakra Depletion** | `exhausted` |
| `reserve / max ≥ 50%` | *(normal)* | — |

Conditions are **mutually exclusive** — Chakra Depletion supersedes Low Reserves.

### Emergency Transfer

When a technique use would bring `pool.value` to 0 but `reserve.value > 0`, the body automatically burns the **entire reserve** to return exactly 1 chakra to the pool (`reserve = 0`, `pool = 1`). This means:

- `pool == 0` is only possible when `reserve == 0`.
- Any technique that fully drains the pool immediately triggers Chakra Depletion.

### Rest Recovery under Chakra Depletion

| Rest type | Pool recovery |
|---|---|
| Normal rest | `floor(pool.max / 4)` |
| Absolute rest (`longTermCare = true`) | `floor(pool.max / 2)` |
| No depletion (normal) | `pool.max` (full) |

### Implied PF1e Conditions

The module applies and removes `fatigued` / `exhausted` via `actor.setConditions()`. To avoid interfering with conditions from other sources (combat effects, spells, etc.), the module **tracks which conditions it applied** in:

```
flags["naruto-d20"].conditions.appliedFatigued   (boolean)
flags["naruto-d20"].conditions.appliedExhausted  (boolean)
```

A PF1e condition is only removed when the module is the one that set it. If `fatigued` was already active from an unrelated source when Low Reserves activates, it will **not** be removed when the reserve recovers above 50%.

## Files Touched

| File | Change |
|---|---|
| `scripts/constants.mjs` | `LOW_RESERVES_CONDITION_ID`, `CHAKRA_DEPLETION_CONDITION_ID` |
| `scripts/data/chakra-conditions.mjs` | **New** — `registerChakraConditions()`, `checkAndUpdateConditions()` |
| `scripts/main.mjs` | Call `registerChakraConditions()` in `pf1PostInit` [2] |
| `scripts/use-technique.mjs` | Emergency Transfer logic; call `checkAndUpdateConditions()` after deduction |
| `scripts/ui/tap-reserves.mjs` | Call `checkAndUpdateConditions()` after successful tap |
| `scripts/data/rest-recovery.mjs` | Depletion-aware pool recovery; call `checkAndUpdateConditions()` after rest |
| `lang/en.json` | Condition names and hints |
| `lang/pt-BR.json` | Condition names and hints (PT-BR) |

## Manual Verification

1. **Low Reserves activates**: Use techniques until `reserve / max < 50%`. The token should display the Low Reserves icon (daze.svg) and the `fatigued` condition should appear in the Buffs/Conditions tab.

2. **Chakra Depletion via reserve drain**: Open the Tap Reserves dialog and transfer all reserve to temp. When reserve hits 0, the Low Reserves icon disappears and Chakra Depletion (skull.svg) + `exhausted` appear.

3. **Emergency Transfer**: Use a technique whose cost exactly matches or exceeds the pool (with reserve still > 0). The result should be `pool = 1`, `reserve = 0`, and Chakra Depletion active.

4. **Normal rest with Depletion**: Rest with Chakra Depletion active. Pool should recover `floor(max / 4)`, not full.

5. **Absolute rest with Depletion**: Rest with `longTermCare = true` + Depletion. Pool recovers `floor(max / 2)`.

6. **Condition removal after rest**: After rest, if reserve recovers to ≥ 50% of max, both conditions should disappear and `exhausted` / `fatigued` should be removed (if we applied them).

7. **No interference with external conditions**: Apply `fatigued` manually to the actor (e.g., via the condition HUD). Then trigger Low Reserves, and finally recover. The manually-applied `fatigued` should **not** be removed when Low Reserves clears.
