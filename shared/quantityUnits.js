export const STANDARD_QUANTITY_UNITS = ["개", "g", "팩"];

const UNIT_DEFINITIONS = new Map([
  ["개", { unit: "개", factor: 1 }],
  ["대", { unit: "개", factor: 1 }],
  ["알", { unit: "개", factor: 1 }],
  ["장", { unit: "개", factor: 1 }],
  ["병", { unit: "개", factor: 1 }],
  ["공기", { unit: "개", factor: 1 }],
  ["g", { unit: "g", factor: 1 }],
  ["그램", { unit: "g", factor: 1 }],
  ["kg", { unit: "g", factor: 1_000 }],
  ["킬로그램", { unit: "g", factor: 1_000 }],
  ["mg", { unit: "g", factor: 0.001 }],
  ["ml", { unit: "g", factor: 1 }],
  ["밀리리터", { unit: "g", factor: 1 }],
  ["l", { unit: "g", factor: 1_000 }],
  ["리터", { unit: "g", factor: 1_000 }],
  ["큰술", { unit: "g", factor: 15 }],
  ["작은술", { unit: "g", factor: 5 }],
  ["컵", { unit: "g", factor: 200 }],
  ["팩", { unit: "팩", factor: 1 }],
  ["봉", { unit: "팩", factor: 1 }],
  ["봉지", { unit: "팩", factor: 1 }],
  ["캔", { unit: "팩", factor: 1 }],
  ["모", { unit: "팩", factor: 1 }],
]);

function normalizeUnitName(unit) {
  return String(unit ?? "").trim().replaceAll(" ", "").toLowerCase();
}

export function getQuantityUnitDefinition(unit) {
  return UNIT_DEFINITIONS.get(normalizeUnitName(unit)) ?? null;
}

export function convertQuantityToStandard(quantity, unit) {
  const numericQuantity = Number(quantity);
  const definition = getQuantityUnitDefinition(unit);
  if (!Number.isFinite(numericQuantity) || !definition) return null;

  return {
    quantity: numericQuantity * definition.factor,
    unit: definition.unit,
    factor: definition.factor,
  };
}

export function convertStandardQuantityToUnit(quantity, unit) {
  const numericQuantity = Number(quantity);
  const definition = getQuantityUnitDefinition(unit);
  if (!Number.isFinite(numericQuantity) || !definition) return null;
  return numericQuantity / definition.factor;
}
