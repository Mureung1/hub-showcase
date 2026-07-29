import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createApp } from "../../../server.js";
import EmotionInputForm from "../features/emotion-input/components/EmotionInputForm.jsx";
import {
  createEmotionAnalysisApi
} from "../features/emotion-session/api/emotionAnalysisApi.js";
import {
  createManualAnalysisPayload
} from "../../../test/fixtures/emotionAnalysisFixtures.js";

const sessionId = "44c96b3d-c657-4a41-876b-a26b53178f59";
const guestSessionId = "550e8400-e29b-41d4-a716-446655440000";
const records = [];
let server;
let baseUrl;
let analysisApi;

function createTestRecord(record) {
  const savedRecord = {
    id: crypto.randomUUID(),
    ...record,
    created_at: new Date().toISOString()
  };
  records.push(savedRecord);
  return savedRecord;
}

describe("화면 → Express 서버 → DB 저장 경계 E2E", () => {
  beforeAll(async () => {
    const app = createApp({
      authenticateGuest: async () => ({
        session: { id: guestSessionId }
      }),
      createAnalysis: async (record) => createTestRecord(record),
      listAnalyses: async (requestedGuestSessionId, limit) =>
        records
          .filter(
            (record) => record.guest_session_id === requestedGuestSessionId
          )
          .slice(0, limit)
    });

    await new Promise((resolve) => {
      server = app.listen(0, "127.0.0.1", resolve);
    });
    const address = server.address();
    baseUrl = `http://127.0.0.1:${address.port}`;
    analysisApi = createEmotionAnalysisApi({ baseUrl });
  });

  afterAll(async () => {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  });

  it("화면에서 제출한 제한 정보가 서버 검증을 거쳐 저장되고 응답으로 돌아온다", async () => {
    let responseRecord;
    const onAnalyze = vi.fn(async (input) => {
      responseRecord = await analysisApi.createEmotionAnalysis(
        createManualAnalysisPayload({
          sessionId,
          ...input,
          selectedScenario: "normal",
          aiResponse: "테스트 응답"
        })
      );
      return true;
    });

    render(
      <EmotionInputForm
        scenarioPreset={{
          faceSignal: "neutral",
          voiceSignal: "normal"
        }}
        faceSignalMetadata={{
          source: "manual",
          confidence: null,
          evidence: [],
          heuristicVersion: null
        }}
        onAnalyze={onAnalyze}
      />
    );

    fireEvent.change(document.querySelector("#situation-text"), {
      target: { value: "오늘은 마음이 편안해요." }
    });
    fireEvent.submit(document.querySelector("form"));

    await waitFor(() => expect(onAnalyze).toHaveBeenCalledOnce());
    await waitFor(() => expect(records).toHaveLength(1));

    expect(records[0]).toMatchObject({
      guest_session_id: guestSessionId,
      situation_text: "오늘은 마음이 편안해요.",
      face_signal: "neutral",
      face_signal_source: "manual",
      face_signal_confidence: null,
      face_signal_evidence: [],
      face_signal_heuristic_version: null,
      voice_signal: "normal",
      selected_scenario: "normal"
    });
    expect(records[0]).not.toHaveProperty("session_id");
    expect(records[0]).not.toHaveProperty("image");
    expect(records[0]).not.toHaveProperty("video");
    expect(records[0]).not.toHaveProperty("landmarks");
    expect(responseRecord).toMatchObject({
      situationText: "오늘은 마음이 편안해요.",
      faceSignalSource: "manual",
      aiResponse: "테스트 응답"
    });
    expect(screen.getByDisplayValue("")).toBeInTheDocument();
  });
});
