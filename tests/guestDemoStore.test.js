import test from "node:test";
import assert from "node:assert/strict";

import { sampleAnalysisResults } from "../src/data/sampleAnalysisResults.js";
import {
  deleteGuestDemoAnalysis,
  readGuestDemoSavedAnalyses,
  saveGuestDemoAnalysis,
} from "../src/storage/guestDemoStore.js";

function createStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  };
}

test("guest demo saved analyses are isolated in the provided browser storage", () => {
  const storage = createStorage();
  const saved = saveGuestDemoAnalysis(sampleAnalysisResults[0], storage);

  assert.match(saved.storageId, /^guest:/);
  assert.equal(readGuestDemoSavedAnalyses(storage).length, 1);

  saveGuestDemoAnalysis(sampleAnalysisResults[0], storage);
  assert.equal(readGuestDemoSavedAnalyses(storage).length, 1);

  deleteGuestDemoAnalysis(saved.storageId, storage);
  assert.deepEqual(readGuestDemoSavedAnalyses(storage), []);
});
