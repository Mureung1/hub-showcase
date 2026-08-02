import assert from "node:assert/strict";
import test from "node:test";

import { findPickupCandidateDetails, findPickupCandidates, hasCompleteCoordinatePair } from "./location-candidates.js";

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

test("Given one owner and two participants at distinct coordinates, then all three positions affect candidate ranking", () => {
  const pickupLocations = [
    { startLocation: "Owner", latitude: 37.5665, longitude: 126.9780 },
    { startLocation: "P1", latitude: 37.5651, longitude: 126.9895 },
    { startLocation: "P2", latitude: 37.5700, longitude: 126.9820 },
  ];

  assert.deepEqual(findPickupCandidates(pickupLocations), ["P2", "Owner", "P1"]);
  assert.deepEqual(findPickupCandidateDetails(pickupLocations), [
    { name: "P2", latitude: 37.57, longitude: 126.982 },
    { name: "Owner", latitude: 37.566, longitude: 126.978 },
    { name: "P1", latitude: 37.565, longitude: 126.99 },
  ]);
});

test("Given duplicate addresses, when only the first entry has coordinates, then the candidate details keep those coordinates", () => {
  const participants = [
    { startLocation: "媛쒖꽕??異쒕컻 ?꾩튂", latitude: 37.501, longitude: 127.001 },
    { startLocation: "媛쒖꽕??異쒕컻 ?꾩튂", latitude: null, longitude: null },
    { startLocation: "李몄뿬 A", latitude: 35.11, longitude: 128.11 },
  ];

  assert.deepEqual(findPickupCandidateDetails(participants), [
    { name: "媛쒖꽕??異쒕컻 ?꾩튂", latitude: 37.501, longitude: 127.001 },
    { name: "李몄뿬 A", latitude: 35.11, longitude: 128.11 },
  ]);
});

test("Given duplicate addresses with a later coordinate-bearing entry, then the valid coordinates are promoted deterministically", () => {
  const participants = [
    { startLocation: "媛쒖꽕??異쒕컻 ?꾩튂", latitude: null, longitude: null },
    { startLocation: "媛쒖꽕??異쒕컻 ?꾩튂", latitude: 37.502, longitude: 127.002 },
    { startLocation: "李몄뿬 A", latitude: 35.11, longitude: 128.11 },
  ];

  assert.deepEqual(findPickupCandidateDetails(participants), [
    { name: "媛쒖꽕??異쒕컻 ?꾩튂", latitude: 37.502, longitude: 127.002 },
    { name: "李몄뿬 A", latitude: 35.11, longitude: 128.11 },
  ]);
});

test("map candidate details follow vote order and lower coordinate precision", () => {
  const participants = [
    { startLocation: "북문 카페", latitude: 35.10004, longitude: 128.10004 },
    { startLocation: "중앙역", latitude: 35.10106, longitude: 128.10106 },
    { startLocation: "직접 입력 장소", latitude: null, longitude: null },
  ];

  assert.deepEqual(findPickupCandidateDetails(participants), [
    { name: "북문 카페", latitude: 35.1, longitude: 128.1 },
    { name: "중앙역", latitude: 35.101, longitude: 128.101 },
    { name: "직접 입력 장소", latitude: null, longitude: null },
  ]);
});
