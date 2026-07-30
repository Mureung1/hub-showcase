import { z } from "zod";

export const pickupCoordinateFields = {
  pickupLatitude: z.number().min(-90).max(90).nullable().optional(),
  pickupLongitude: z.number().min(-180).max(180).nullable().optional(),
};

export function hasCompletePickupCoordinatePair({ pickupLatitude, pickupLongitude }) {
  return (pickupLatitude == null) === (pickupLongitude == null);
}

export function hasCompletePickupCoordinatePatch(value) {
  const hasLatitude = Object.hasOwn(value, "pickupLatitude");
  const hasLongitude = Object.hasOwn(value, "pickupLongitude");
  if (hasLatitude !== hasLongitude) return false;
  return !hasLatitude || hasCompletePickupCoordinatePair(value);
}

export const pickupCoordinateSchema = z
  .object(pickupCoordinateFields)
  .refine(hasCompletePickupCoordinatePair);

export const pickupCoordinatePatchSchema = z
  .object(pickupCoordinateFields)
  .partial()
  .refine(hasCompletePickupCoordinatePatch);
