import React from "react";
import { FaceSignalSelector } from "../../face-signal";
import { SituationInput } from "../../situation-input";
import { VoiceSignalSelector } from "../../voice-signal";

export default function EmotionInputForm({
  situationText,
  onSituationChange,
  faceSignal,
  onFaceSignalChange,
  voiceSignal,
  onVoiceSignalChange,
  validationError,
  disabled = false,
  onSubmit
}) {
  const handleSubmit = (event) => {
    event.preventDefault();
    if (!disabled) onSubmit();
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (!disabled) onSubmit();
    }
  };

  return (
    <form className="input-area" onSubmit={handleSubmit} noValidate>
      <SituationInput
        value={situationText}
        onChange={onSituationChange}
        onKeyDown={handleKeyDown}
        disabled={disabled}
      />

      <div className="signal-grid">
        <FaceSignalSelector value={faceSignal} onChange={onFaceSignalChange} disabled={disabled} />
        <VoiceSignalSelector value={voiceSignal} onChange={onVoiceSignalChange} disabled={disabled} />
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
