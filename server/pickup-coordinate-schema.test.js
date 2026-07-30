import assert from "node:assert/strict";
import test from "node:test";

import { pickupCoordinatePatchSchema, pickupCoordinateSchema } from "./pickup-coordinate-schema.js";

test("Given omitted or null pickup coordinates, when parsed, then an empty coordinate pair is accepted", () => {
  assert.equal(pickupCoordinateSchema.safeParse({}).success, true);
  assert.equal(pickupCoordinateSchema.safeParse({
    pickupLatitude: null,
    pickupLongitude: null,
  }).success, true);
});

test("Given boundary pickup coordinates, when parsed, then the complete pair is accepted", () => {
  assert.equal(pickupCoordinateSchema.safeParse({
    pickupLatitude: -90,
    pickupLongitude: 180,
  }).success, true);
  assert.equal(pickupCoordinateSchema.safeParse({
    pickupLatitude: 90,
    pickupLongitude: -180,
  }).success, true);
});

test("Given one-sided pickup coordinates, when parsed, then every malformed pair is rejected", () => {
  const malformedPairs = [
    { pickupLatitude: 35.1 },
    { pickupLongitude: 128.1 },
    { pickupLatitude: 35.1, pickupLongitude: null },
    { pickupLatitude: null, pickupLongitude: 128.1 },
  ];

  for (const malformedPair of malformedPairs) {
    assert.equal(pickupCoordinateSchema.safeParse(malformedPair).success, false);
  }
});

test("Given non-finite or out-of-range pickup coordinates, when parsed, then the pair is rejected", () => {
  const invalidPairs = [
    { pickupLatitude: Number.NaN, pickupLongitude: 128.1 },
    { pickupLatitude: 35.1, pickupLongitude: Number.POSITIVE_INFINITY },
    { pickupLatitude: -90.01, pickupLongitude: 128.1 },
    { pickupLatitude: 35.1, pickupLongitude: 180.01 },
    { pickupLatitude: "35.1", pickupLongitude: 128.1 },
  ];

  for (const invalidPair of invalidPairs) {
    assert.equal(pickupCoordinateSchema.safeParse(invalidPair).success, false);
  }
});

test("Given a coordinate patch, when only one key is supplied, then it is rejected", () => {
  assert.equal(pickupCoordinatePatchSchema.safeParse({ pickupLatitude: null }).success, false);
  assert.equal(pickupCoordinatePatchSchema.safeParse({ pickupLongitude: null }).success, false);
  assert.equal(pickupCoordinatePatchSchema.safeParse({
    pickupLatitude: null,
    pickupLongitude: null,
  }).success, true);
});
