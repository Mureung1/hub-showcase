import React, { memo } from "react";
import { voiceOptions } from "../data/voiceOptions";

const VoiceSignalSelector = memo(function VoiceSignalSelector({ value, onChange, disabled = false }) {
  return (
    <fieldset className="signal-selector" disabled={disabled}>
      <legend>목소리 어조 신호</legend>
      <div className="signal-options">
        {voiceOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            className={value === option.value ? "active" : ""}
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
});

export default VoiceSignalSelector;
