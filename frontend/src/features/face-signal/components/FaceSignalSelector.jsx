import React from "react";
import { faceOptions } from "../data/faceOptions";

export default function FaceSignalSelector({ value, onChange, disabled = false }) {
  return (
    <fieldset className="signal-selector" disabled={disabled}>
      <legend>얼굴 표정 신호</legend>
      <div className="signal-options">
        {faceOptions.map((option) => (
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
}
