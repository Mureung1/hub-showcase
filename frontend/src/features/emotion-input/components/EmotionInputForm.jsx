import React, { useEffect, useState } from "react";
import {
  EMOTION_ANALYSIS_LIMITS,
  FACE_SIGNAL_HEURISTIC_VERSION
} from "../../../../../shared/contracts/emotionAnalysisContract";
import { FaceCamera } from "../../face-camera";
import { faceOptions, voiceOptions } from "../data/signalOptions";
import SignalSelector from "./SignalSelector";

export default function EmotionInputForm({
  scenarioPreset,
  faceSignalMetadata,
  disabled = false,
  onAnalyze,
  onLiveFaceSignalChange
}) {
  const [situationText, setSituationText] = useState("");
  const [faceInputMode, setFaceInputMode] = useState(
    faceSignalMetadata?.source === "camera" ? "camera" : "manual"
  );
  const [manualFaceSignal, setManualFaceSignal] = useState(
    scenarioPreset?.faceSignal || "neutral"
  );
  const [detectedFaceResult, setDetectedFaceResult] = useState(() =>
    faceSignalMetadata?.source === "camera" &&
    Number.isFinite(faceSignalMetadata.confidence)
      ? {
          legacySignal: scenarioPreset?.faceSignal || "neutral",
          confidence: faceSignalMetadata.confidence,
          evidence: faceSignalMetadata.evidence || []
        }
      : null
  );
  const [voiceSignal, setVoiceSignal] = useState(scenarioPreset?.voiceSignal || "normal");
  const [validationError, setValidationError] = useState("");

  useEffect(() => {
    if (!scenarioPreset) return;
    setManualFaceSignal(scenarioPreset.faceSignal);
    setVoiceSignal(scenarioPreset.voiceSignal);
    setValidationError("");
  }, [scenarioPreset]);

  useEffect(() => {
    if (faceSignalMetadata?.source === "camera" && Number.isFinite(faceSignalMetadata.confidence)) {
      setFaceInputMode("camera");
      setDetectedFaceResult({
        legacySignal: scenarioPreset?.faceSignal || "neutral",
        confidence: faceSignalMetadata.confidence,
        evidence: faceSignalMetadata.evidence || []
      });
      return;
    }

    setFaceInputMode("manual");
    setDetectedFaceResult(null);
  }, [faceSignalMetadata, scenarioPreset?.faceSignal]);

  const submitInput = async () => {
    const trimmedText = situationText.trim();
    if (!trimmedText) {
      setValidationError("분석할 상황을 입력해 주세요.");
      return;
    }

    const usesCameraResult = faceInputMode === "camera" && detectedFaceResult;
    const faceSignal = usesCameraResult
      ? detectedFaceResult.legacySignal
      : manualFaceSignal;

    setValidationError("");
    const accepted = await onAnalyze({
      situationText: trimmedText,
      faceSignal,
      faceSignalSource: usesCameraResult ? "camera" : "manual",
      faceSignalConfidence: usesCameraResult ? detectedFaceResult.confidence : null,
      faceSignalEvidence: usesCameraResult ? detectedFaceResult.evidence : [],
      faceSignalHeuristicVersion: usesCameraResult
        ? FACE_SIGNAL_HEURISTIC_VERSION
        : null,
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

  const handleFaceInputModeChange = (mode) => {
    setFaceInputMode(mode);
    if (mode === "manual") onLiveFaceSignalChange?.(null);
  };

  const handleCameraSignalChange = (result) => {
    setDetectedFaceResult(result);
    onLiveFaceSignalChange?.(result);
  };

  return (
    <form className="input-area" onSubmit={handleSubmit} noValidate>
      <div className="situation-input">
        <div className="field-heading">
          <label htmlFor="situation-text">지금 겪고 있는 상황</label>
          <span aria-live="polite">
            {situationText.length}/{EMOTION_ANALYSIS_LIMITS.situationTextLength}자
          </span>
        </div>
        <textarea
          id="situation-text"
          value={situationText}
          onChange={(event) => handleSituationChange(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="메시지를 입력하세요..."
          maxLength={EMOTION_ANALYSIS_LIMITS.situationTextLength}
          disabled={disabled}
          aria-describedby="situation-input-description"
          rows={3}
        />
        <span id="situation-input-description" className="sr-only">
          Enter 키로 분석하고 전송하며 Shift와 Enter 키를 함께 누르면 줄을 바꿉니다.
        </span>
      </div>

      <div className="signal-grid">
        <div className="face-signal-input">
          <div className="field-heading">
            <span>얼굴 표정 신호 입력 방식</span>
            <div className="face-input-mode" role="group" aria-label="얼굴 표정 신호 입력 방식">
              <button
                type="button"
                className={faceInputMode === "manual" ? "active" : ""}
                aria-pressed={faceInputMode === "manual"}
                onClick={() => handleFaceInputModeChange("manual")}
                disabled={disabled}
              >
                수동 선택
              </button>
              <button
                type="button"
                className={faceInputMode === "camera" ? "active" : ""}
                aria-pressed={faceInputMode === "camera"}
                onClick={() => handleFaceInputModeChange("camera")}
                disabled={disabled}
              >
                자동 감지
              </button>
            </div>
          </div>

          {faceInputMode === "manual" ? (
            <SignalSelector
              legend="얼굴 표정 신호"
              options={faceOptions}
              value={manualFaceSignal}
              onChange={setManualFaceSignal}
              disabled={disabled}
            />
          ) : (
            <>
              <FaceCamera
                onSignalChange={handleCameraSignalChange}
                initialResult={detectedFaceResult}
                disabled={disabled}
              />
              {!detectedFaceResult && (
                <p className="camera-fallback">
                  안정화된 신호가 없으면 현재 수동 선택값인{" "}
                  {faceOptions.find((option) => option.value === manualFaceSignal)?.label}을 사용합니다.
                </p>
              )}
            </>
          )}
        </div>
        <SignalSelector
          legend="목소리 어조 신호"
          options={voiceOptions}
          value={voiceSignal}
          onChange={setVoiceSignal}
          disabled={disabled}
        />
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
