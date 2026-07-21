import React, { useEffect, useState } from "react";
import { FaceSignalSelector } from "../../face-signal";
import { SituationInput } from "../../situation-input";
import { VoiceSignalSelector } from "../../voice-signal";

export default function EmotionInputForm({
  scenarioPreset,
  disabled = false,
  onAnalyze
}) {
  const [situationText, setSituationText] = useState("");
  const [faceSignal, setFaceSignal] = useState(scenarioPreset?.faceSignal || "neutral");
  const [voiceSignal, setVoiceSignal] = useState(scenarioPreset?.voiceSignal || "normal");
  const [validationError, setValidationError] = useState("");

  useEffect(() => {
    if (!scenarioPreset) return;
    setFaceSignal(scenarioPreset.faceSignal);
    setVoiceSignal(scenarioPreset.voiceSignal);
    setValidationError("");
  }, [scenarioPreset]);

  const submitInput = async () => {
    const trimmedText = situationText.trim();
    if (!trimmedText) {
      setValidationError("분석할 상황을 입력해 주세요.");
      return;
    }

    setValidationError("");
    const accepted = await onAnalyze({
      situationText: trimmedText,
      faceSignal,
      voiceSignal
    });
    if (accepted !== false) setSituationText("");
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!disabled) void submitInput();
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (!disabled) void submitInput();
    }
  };

  const handleSituationChange = (nextValue) => {
    setSituationText(nextValue);
    if (validationError) setValidationError("");
  };

  return (
    <form className="input-area" onSubmit={handleSubmit} noValidate>
      <SituationInput
        value={situationText}
        onChange={handleSituationChange}
        onKeyDown={handleKeyDown}
        disabled={disabled}
      />

      <div className="signal-grid">
        <FaceSignalSelector value={faceSignal} onChange={setFaceSignal} disabled={disabled} />
        <VoiceSignalSelector value={voiceSignal} onChange={setVoiceSignal} disabled={disabled} />
      </div>

      <div className="input-actions">
        <div className="validation-message" role={validationError ? "alert" : undefined}>
          {validationError}
        </div>
        <button type="submit" disabled={disabled || !situationText.trim()}>
          {disabled ? "처리 중..." : "분석하고 전송"}
        </button>
      </div>
    </form>
  );
}
