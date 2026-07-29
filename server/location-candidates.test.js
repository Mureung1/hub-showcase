import assert from "node:assert/strict";
import test from "node:test";

import { findPickupCandidates, hasCompleteCoordinatePair } from "./location-candidates.js";

test("Given coordinates, when only one value is present, then the pair is rejected", () => {
  assert.equal(hasCompleteCoordinatePair({ latitude: 35.1, longitude: null }), false);
  assert.equal(hasCompleteCoordinatePair({ latitude: null, longitude: 128.1 }), false);
  assert.equal(hasCompleteCoordinatePair({ latitude: null, longitude: null }), true);
  assert.equal(hasCompleteCoordinatePair({ latitude: 35.1, longitude: 128.1 }), true);
});

test("Given custom participant locations, when candidates are ranked, then the shortest shared travel locations come first", () => {
  const participants = [
    { startLocation: "북문 카페", latitude: 35.1000, longitude: 128.1000 },
    { startLocation: "중앙역", latitude: 35.1010, longitude: 128.1010 },
    { startLocation: "남문 편의점", latitude: 35.1200, longitude: 128.1200 },
  ];

  assert.deepEqual(findPickupCandidates(participants), [
    "중앙역",
    "북문 카페",
    "남문 편의점",
  ]);
});

test("Given locations without coordinates, when candidates are created, then unique custom names remain available", () => {
  const participants = [
    { startLocation: "우리 학교 정문" },
    { startLocation: "우리 학교 정문" },
    { startLocation: "기숙사 로비" },
  ];

  assert.deepEqual(findPickupCandidates(participants), [
    "우리 학교 정문",
    "기숙사 로비",
  ]);
});

test("Given different coordinates with different current-location labels, when candidates are ranked, then every point is considered", () => {
  const participants = [
    { startLocation: "민지의 현재 위치", latitude: 35.1000, longitude: 128.1000 },
    { startLocation: "시우의 현재 위치", latitude: 35.1100, longitude: 128.1100 },
  ];

  assert.deepEqual(findPickupCandidates(participants).sort(), [
    "민지의 현재 위치",
    "시우의 현재 위치",
  ].sort());
});

test("Given an owner location without coordinates, when participant coordinates are ranked, then the owner location remains a candidate", () => {
  const participants = [
    { startLocation: "개설자 출발 위치", latitude: null, longitude: null },
    { startLocation: "참여자 A", latitude: 35.1000, longitude: 128.1000 },
    { startLocation: "참여자 B", latitude: 35.1100, longitude: 128.1100 },
  ];

  assert.deepEqual(findPickupCandidates(participants), [
    "참여자 A",
    "참여자 B",
    "개설자 출발 위치",
  ]);
});
