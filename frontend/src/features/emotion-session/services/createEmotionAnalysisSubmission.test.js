import assert from "node:assert/strict";
import test from "node:test";
import { createEmotionAnalysisSubmission } from "./createEmotionAnalysisSubmission.js";

const analysisInput = {
  situationText: "오늘 조금 불안했어.",
  faceSignal: "tense",
  faceSignalSource: "camera",
  faceSignalConfidence: 0.82,
  faceSignalEvidence: ["browDownLeft"],
  faceSignalHeuristicVersion: "v1",
  faceFeatures: [{ name: "browDownLeft", score: 0.82 }],
  voiceSignal: "normal",
  selectedScenario: "normal"
};

const analysisResult = {
  scores: [
    { key: "anxiety", label: "불안", score: 62 },
    { key: "neutral", label: "평온", score: 38 }
  ],
  possibleStates: [{ label: "긴장 가능성", confidence: 0.62 }],
  evidence: ["카메라에서 감지한 얼굴 움직임 강도를 실시간 반영"],
  responseApproach: "ask_gently",
  needsConfirmation: true
};

test("Gemini emotion analysis feeds the saved conversation", async () => {
  let generatedInput;
  let savedRecord;

  const result = await createEmotionAnalysisSubmission({
    sessionId: "browser-session",
    analysisInput,
    previewAnalysisResult: analysisResult,
    recentMessages: [{ id: "1", role: "user", content: "이전 이야기" }],
    generateResponse: async (input) => {
      generatedInput = input;
      return {
        response: "긴장되는 순간이었나 봐. 지금 몸은 조금 괜찮아?",
        analysis: analysisResult,
        source: "gemini"
      };
    },
    saveAnalysis: async (record) => {
      savedRecord = record;
      return { id: "record-1", ...record };
    }
  });

  assert.deepEqual(generatedInput.signals.faceFeatures, [
    { name: "browDownLeft", score: 0.82 }
  ]);
  assert.strictEqual(savedRecord.analysisResult, analysisResult);
  assert.equal(savedRecord.faceSignal, null);
  assert.equal(savedRecord.faceSignalSource, "camera");
  assert.equal(result.createdRecord.aiResponse, result.aiResponse);
});

test("provider failures are not replaced with mock chat", async () => {
  const providerError = Object.assign(new Error("provider unavailable"), {
    code: "AI_PROVIDER_UNAVAILABLE"
  });

  await assert.rejects(
    () =>
      createEmotionAnalysisSubmission({
        sessionId: "browser-session",
        analysisInput,
        previewAnalysisResult: analysisResult,
        generateResponse: async () => {
          throw providerError;
        },
        saveAnalysis: async (record) => record
      }),
    (error) => error === providerError
  );
});

test("AI quota exhaustion returns the sleep message and remains saveable", async () => {
  const created = await createEmotionAnalysisSubmission({
    sessionId: "browser-session",
    analysisInput,
    previewAnalysisResult: analysisResult,
    generateResponse: async () => {
      throw Object.assign(new Error("quota exhausted"), {
        code: "AI_RATE_LIMIT_EXCEEDED"
      });
    },
    saveAnalysis: async (record) => ({ id: "record-2", ...record })
  });

  assert.equal(created.aiResponse, "Noa는 자고 있어요.");
  assert.equal(created.createdRecord.aiResponse, "Noa는 자고 있어요.");
});
