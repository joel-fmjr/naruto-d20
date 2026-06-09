# Speed Rank (KOUSOKU) Automatic Penalties

Implements the two penalty rules from the KOUSOKU buff description:

- **Immobilizing conditions** (helpless, paralyzed, grappled, pinned) → speed rank drops to **0**.
- **Medium armor** equipped → **−1** speed rank.
- **Heavy armor** equipped → **−3** speed rank.

> **Note on `immobilized`:** `immobilized` is **not** a native PF1e 11.11 condition. It has been removed from the supported list. The condition would only work if this module or another explicitly registers a custom ActiveEffect status with the exact ID `immobilized`. `grappled` does **not** automatically add `immobilized` — `paralyzed` adds `helpless` as a secondary status, but `grappled` adds no secondary statuses.

## How it works

The implementation hooks into PF1e's `pf1GetRollData` event. When PF1e evaluates roll data for the KOUSOKU buff item, the hook injects a `data.item.speedRank` object containing all pre-computed table values. The buff's change formulas reference those values directly.

**Source:** `scripts/automation/speed-rank-penalties.mjs`  
**Registered in:** `scripts/main.mjs` `setup` hook, via `registerSpeedRankPenalties()`

### Roll-data shape

```js
data.item.speedRank = {
  level:  effectiveLevel,
  jump:   effectiveLevel > 0 ? Math.min(effectiveLevel + 1, 10) : 0,
  dodge:  effectiveLevel,
  attack: Math.floor(effectiveLevel / 2),
  speed:  effectiveLevel > 0 ? effectiveLevel * 5 + 5 : 0,
  hide:   effectiveLevel > 0 ? Math.min(effectiveLevel + 1, 10) : 0,
  cmb:    -Math.floor(effectiveLevel / 2),
};
```

The compendium change formulas reference these fields:

| Change `_id` | Target | Formula |
|---|---|---|
| `B5YddrZI` | `skill.acr` | `@item.speedRank.jump` |
| `JfNd3IDk` | `ac` | `@item.speedRank.dodge` |
| `vkK43M8p` | `attack` | `@item.speedRank.attack` |
| `PDR8lbWh` | `allSpeeds` | `@item.speedRank.speed` |
| `RjMHVqgN` | `skill.ste` | `@item.speedRank.hide` |
| `17OhbWVn` | `ref` | `@item.speedRank.dodge` |
| `YfxaAt5D` | `cmb` | `@item.speedRank.cmb` |

### Effective level computation

1. If the actor has any immobilizing condition (`helpless`, `paralyzed`, `grappled`, `pinned`) → effective level = 0.
2. Otherwise, read PF1e's consolidated armor type from `data.armor.type` (numeric: 0 = none, 1 = light, 2 = medium, 3 = heavy).
3. Apply penalty: medium (type 2) → −1, heavy (type 3) → −3; clamp to 0.

Using `data.armor.type` (prepared by PF1e) instead of scanning items avoids the edge cases of `item.isActive` (zero quantity, zero HP, invalid container), and correctly aggregates the heaviest active armor across multiple equipped pieces.

### Table caps

Jump and Hide cap at +10 per the KOUSOKU table (rank 10 → +10, not +11). At rank 0 all values are explicitly 0 — no residual `+1` or `+5 ft` bonus.

### Base rank preservation

The base rank is stored in `flags["naruto-d20"].rankBuff.level` on the buff item (written by `buff-application.mjs` when the technique is performed). `system.level` is never mutated at runtime; `pf1GetRollData` reads the flag each time the buff is evaluated.

## Why this design was chosen

The previous event-driven approach (`createItem`, `updateItem`, `createActiveEffect`, `deleteActiveEffect`) mutated `system.level` on the buff document. It had several problems:

- **Stale rank after armor deletion** — `deleteItem` was not handled.
- **Rank 0 still granted bonuses** — `@item.level + 1` at level 0 = +1.
- **Armor detection gaps** — `system.equipped` alone does not match PF1e's `item.isActive`.
- **Multi-armor ordering bug** — early return on first medium armor could miss a later heavy armor.
- **No initial reconciliation** — actors already wearing armor on module load were not corrected.
- **Multi-client race** — two owners could each write `system.level` for the same event.

The `pf1GetRollData` approach eliminates all of these: no document mutations, no hooks beyond the single roll-data hook, and PF1e's own armor aggregation logic is reused automatically.

## PF1e API facts used

| Question | Answer |
|---|---|
| Hook for injecting buff roll data | `pf1GetRollData(item, data)` |
| PF1e consolidated armor category in roll data | `data.armor.type` (0 none, 1 light, 2 medium, 3 heavy) |
| How to detect an active condition | `actor.statuses?.has("conditionId")` |
| Does `grappled` add `immobilized`? | **No.** `paralyzed` adds `helpless`; `grappled` adds no secondary statuses. |
| Is `immobilized` a native PF1e 11.11 condition? | **No.** Not registered by PF1e 11.11. |
