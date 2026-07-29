import assert from "node:assert/strict";
import test from "node:test";
import { getGroupBuySearchResults } from "./groupBuyRecommendations.js";

const items = [
  { id: "exact", name: "Protein-Shake 12 pack", category: "식품", status: "open", currentPeople: 1, targetPeople: 5 },
  { id: "duplicate", name: " protein shake, 12 PACK! ", category: "식품", status: "open", currentPeople: 4, targetPeople: 5 },
  { id: "token-high", name: "초코 Protein 바", category: "간식", status: "open", currentPeople: 8, targetPeople: 10 },
  { id: "token-low", name: "Protein 보충제", category: "건강", status: "open", currentPeople: 2, targetPeople: 10 },
  { id: "category", name: "닭가슴살 묶음", category: "식품", status: "open", currentPeople: 9, targetPeople: 10 },
  { id: "closed", name: "Protein 파우더", category: "식품", status: "closed", currentPeople: 9, targetPeople: 10 },
  { id: "unrelated", name: "연필 세트", category: "문구", status: "open", currentPeople: 9, targetPeople: 10 },
];

test("normalizes Korean/English case, whitespace, and punctuation for exact matches", () => {
  const result = getGroupBuySearchResults(items, "  PROTEIN, shake!!  ");
  assert.deepEqual(result.exact.map(({ id }) => id), ["exact", "duplicate"]);
});

test("returns up to three scored open recommendations without exact or closed duplicates", () => {
  const result = getGroupBuySearchResults(items, "protein shake");
  assert.deepEqual(result.recommendations.map(({ id }) => id), ["token-high", "token-low", "category"]);
  assert.equal(result.recommendations.length, 3);
});

test("breaks equal scores by progress and remains deterministic without mutating input", () => {
  const input = structuredClone(items);
  const snapshot = structuredClone(input);
  const first = getGroupBuySearchResults(input, "protein shake");
  const second = getGroupBuySearchResults(input, "protein shake");

  assert.deepEqual(first, second);
  assert.deepEqual(input, snapshot);
  assert.deepEqual(first.recommendations.map(({ id }) => id), ["token-high", "token-low", "category"]);
});

test("handles malformed inputs and blank queries with empty independent arrays", () => {
  assert.deepEqual(getGroupBuySearchResults(null, "protein"), { exact: [], recommendations: [] });
  assert.deepEqual(getGroupBuySearchResults(items, {}), { exact: [], recommendations: [] });
  assert.deepEqual(getGroupBuySearchResults(items, " .,! "), { exact: [], recommendations: [] });
});
