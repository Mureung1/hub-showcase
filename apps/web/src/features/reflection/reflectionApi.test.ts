import assert from "node:assert/strict";
import test from "node:test";
import { createEmptyReflectionDraft } from "./reflection";
import {
  ReflectionSaveApiError,
  loadReflectionDraftFromApi,
  saveReflectionDraftToApi,
} from "./reflectionApi";

test("saveReflectionDraftToApi posts the complete draft to its analysis result", async () => {
  const draft = createEmptyReflectionDraft();
  const fetchCalls: Array<{ input: string; init?: RequestInit }> = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    fetchCalls.push({ input: String(input), init });
    return new Response(
      JSON.stringify({ analysisResultId: "analysis-id", draft, savedAt: "now" }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  };

  await assert.doesNotReject(
    saveReflectionDraftToApi("analysis-id", draft, fetchImpl, "http://localhost:3000"),
  );
  assert.equal(
    fetchCalls[0].input,
    "http://localhost:3000/api/v1/repository-analyses/analysis-id/reflection",
  );
  assert.deepEqual(fetchCalls[0].init, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ draft, technicalChallenges: [], codeReferences: [] }),
  });
});

test("saveReflectionDraftToApi exposes a stable API error", async () => {
  const fetchImpl: typeof fetch = async () =>
    new Response(
      JSON.stringify({ code: "REFLECTION_SAVE_FAILED", message: "회고 저장에 실패했습니다." }),
      { status: 500, headers: { "content-type": "application/json" } },
    );

  await assert.rejects(
    saveReflectionDraftToApi("analysis-id", createEmptyReflectionDraft(), fetchImpl),
    (error: unknown) => {
      assert.ok(error instanceof ReflectionSaveApiError);
      assert.equal(error.code, "REFLECTION_SAVE_FAILED");
      assert.equal(error.status, 500);
      return true;
    },
  );
});

test("saveReflectionDraftToApi reports a network failure", async () => {
  const fetchImpl: typeof fetch = async () => {
    throw new TypeError("fetch failed");
  };

  await assert.rejects(
    saveReflectionDraftToApi("analysis-id", createEmptyReflectionDraft(), fetchImpl),
    /회고 저장 서버에 연결할 수 없습니다/,
  );
});

test("loadReflectionDraftFromApi restores the saved draft", async () => {
  const draft = createEmptyReflectionDraft();
  const fetchImpl: typeof fetch = async () =>
    new Response(
      JSON.stringify({ analysisResultId: "analysis-id", draft, savedAt: "now" }),
      { status: 200, headers: { "content-type": "application/json" } },
    );

  await assert.deepEqual(
    await loadReflectionDraftFromApi("analysis-id", fetchImpl, "http://localhost:3000"),
    { analysisResultId: "analysis-id", draft, savedAt: "now" },
  );
});

test("loadReflectionDraftFromApi treats a missing draft as empty server state", async () => {
  const fetchImpl: typeof fetch = async () => new Response(null, { status: 200 });

  await assert.deepEqual(
    await loadReflectionDraftFromApi("analysis-id", fetchImpl),
    null,
  );
});
