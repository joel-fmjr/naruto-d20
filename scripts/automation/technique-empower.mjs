const SUPPORTED_MODES = new Set(["damageBonus"]);
const SIMPLE_DIE_RE = /^1d(\d+)$/i;

export function normalizeEmpowerConfig(raw = {}) {
  const mode = String(raw.mode ?? "damageBonus").trim() || "damageBonus";
  return {
    enabled: raw.enabled === true,
    mode: SUPPORTED_MODES.has(mode) ? mode : "damageBonus",
    costPerStep: Math.max(1, Number(raw.costPerStep ?? 1) || 1),
    formulaPerStep: String(raw.formulaPerStep ?? "1d6").trim() || "1d6",
    damageTypes: Array.isArray(raw.damageTypes)
      ? raw.damageTypes.map((t) => String(t).trim()).filter(Boolean)
      : [],
    maxStepsFormula: String(raw.maxStepsFormula ?? "").trim(),
    performIncreaseEvery: Math.max(0, Number(raw.performIncreaseEvery ?? 0) || 0),
    performIncreaseAmount: Math.max(0, Number(raw.performIncreaseAmount ?? 0) || 0),
  };
}

export function buildEmpowerDamageFormula({ steps, formulaPerStep }) {
  const count = Math.max(0, Number(steps) || 0);
  if (count <= 0) return "";

  const formula = String(formulaPerStep ?? "").trim();
  const die = formula.match(SIMPLE_DIE_RE);
  if (die) return `${count}d${die[1]}[Empower]`;
  return `${count} * (${formula})[Empower]`;
}

export function empowerPerformIncrease({
  steps,
  performIncreaseEvery,
  performIncreaseAmount,
}) {
  const every = Math.max(0, Number(performIncreaseEvery) || 0);
  const amount = Math.max(0, Number(performIncreaseAmount) || 0);
  if (!every || !amount) return 0;
  return Math.floor(Math.max(0, Number(steps) || 0) / every) * amount;
}

export async function resolveEmpowerStepLimit({ config, rollData = {}, availableExtraChakra }) {
  const costPerStep = Math.max(1, Number(config?.costPerStep ?? 1) || 1);
  const chakraLimit = Math.floor(Math.max(0, Number(availableExtraChakra) || 0) / costPerStep);
  const formula = String(config?.maxStepsFormula ?? "").trim();
  if (!formula) return chakraLimit;

  const total = await evaluateFormula(formula, rollData);
  return Math.max(0, Math.min(chakraLimit, Math.floor(Number(total) || 0)));
}

function evaluateFormula(formula, rollData) {
  const normalized = String(formula).replace(/@([a-zA-Z0-9_.]+)/g, (_, path) => {
    const value = path.split(".").reduce((obj, key) => obj?.[key], rollData);
    return Number(value ?? 0);
  });
  return Function("min", "max", "floor", "ceil", `return (${normalized})`)(
    Math.min,
    Math.max,
    Math.floor,
    Math.ceil,
  );
}
