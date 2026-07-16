import React from "react";
import { scenarioOptions } from "../data/scenarioPresets";

export default function ScenarioSelector({ value, onChange, disabled = false }) {
  return (
    <section className="scenarios" aria-labelledby="scenario-title">
      <h4 id="scenario-title">상황 시뮬레이션</h4>
      <div className="scenario-buttons" role="group" aria-label="상황 시뮬레이션">
        {scenarioOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            className={value === option.value ? "active" : ""}
            aria-pressed={value === option.value}
            disabled={disabled}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </section>
  );
}
