import assert from "node:assert/strict";
import test from "node:test";
import { getAnalysisLogMessage } from "./analysisLog";

test("marks completed analysis log steps without changing existing OK markers", () => {
  assert.equal(getAnalysisLogMessage("SCANNING FILE STRUCTURE...", true), "> SCANNING FILE STRUCTURE... [OK]");
  assert.equal(getAnalysisLogMessage("EXTRACTING DEPENDENCIES... [OK]", true), "> EXTRACTING DEPENDENCIES... [OK]");
});
