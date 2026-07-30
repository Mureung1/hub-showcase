import assert from "node:assert/strict";
import test from "node:test";

import { createLocationSelection, isActiveLocationRequest, LOCATION_PRIVACY_NOTICE } from "./locationSelection.js";

test("a typed address can be selected without coordinates", () => {
  assert.deepEqual(createLocationSelection("  중앙도서관 북문  ", null, null), {
    address: "중앙도서관 북문",
    latitude: null,
    longitude: null,
  });
});

test("a map selection keeps a complete coordinate pair", () => {
  assert.deepEqual(createLocationSelection("학생회관 앞", 37.5665, 126.978), {
    address: "학생회관 앞",
    latitude: 37.5665,
    longitude: 126.978,
  });
});

test("an incomplete or out-of-range coordinate pair is rejected", () => {
  assert.throws(() => createLocationSelection("학생회관 앞", 37.5, null));
  assert.throws(() => createLocationSelection("학생회관 앞", 91, 126.9));
});

test("the privacy notice explains that OpenStreetMap receives map requests", () => {
  assert.match(LOCATION_PRIVACY_NOTICE, /OpenStreetMap/);
  assert.match(LOCATION_PRIVACY_NOTICE, /지도 요청/);
});

test("a stale or unmounted geolocation response is ignored", () => {
  assert.equal(isActiveLocationRequest(2, 2, true), true);
  assert.equal(isActiveLocationRequest(1, 2, true), false);
  assert.equal(isActiveLocationRequest(2, 2, false), false);
});
