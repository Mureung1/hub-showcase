const MIN_TARGET_PEOPLE = 2;
const MAX_TARGET_PEOPLE = 50;

export function calculateFreeShippingTarget(input) {
  if (input === null || typeof input !== "object") return null;

  const { unitPrice, perPersonQuantity, freeShippingThreshold } = input;
  if (
    !Number.isFinite(unitPrice)
    || !Number.isFinite(perPersonQuantity)
    || !Number.isFinite(freeShippingThreshold)
    || unitPrice <= 0
    || perPersonQuantity <= 0
    || freeShippingThreshold <= 0
  ) {
    return null;
  }

  const targetPeople = Math.ceil(freeShippingThreshold / (unitPrice * perPersonQuantity));
  return targetPeople >= MIN_TARGET_PEOPLE && targetPeople <= MAX_TARGET_PEOPLE
    ? targetPeople
    : null;
}
