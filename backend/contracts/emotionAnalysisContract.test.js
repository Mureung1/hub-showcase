import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  EMOTION_ANALYSIS_LIMITS,
  FACE_SIGNALS,
  FACE_SIGNAL_SOURCES,
  SCENARIOS,
  VOICE_SIGNALS
} from "../../shared/contracts/emotionAnalysisContract.js";
import {
  faceOptions,
  voiceOptions
} from "../../frontend/src/features/emotion-input/data/signalOptions.js";
import {
  scenarioOptions
} from "../../frontend/src/features/scenario-simulation/data/scenarioPresets.js";

describe("emotion analysis contract", () => {
  it("keeps frontend options aligned with the shared contract", () => {
    expect(faceOptions.map((option) => option.value)).toEqual(FACE_SIGNALS);
    expect(voiceOptions.map((option) => option.value)).toEqual(VOICE_SIGNALS);
    expect(scenarioOptions.map((option) => option.value)).toEqual(SCENARIOS);
  });

  it("keeps SQL constraints aligned with shared allowed values", async () => {
    const schema = await readFile(
      resolve(process.cwd(), "backend/supabase-schema.sql"),
      "utf8"
    );

    [...FACE_SIGNALS, ...VOICE_SIGNALS, ...SCENARIOS, ...FACE_SIGNAL_SOURCES].forEach(
      (value) => {
        expect(schema).toContain(`'${value}'`);
      }
    );
    expect(schema).toContain(
      `between 1 and ${EMOTION_ANALYSIS_LIMITS.situationTextLength}`
    );
    expect(schema).toContain("face_signal_source = 'manual'");
    expect(schema).toContain("face_signal_source = 'camera'");
    expect(schema).toContain("face_signal is null");
  });
});
