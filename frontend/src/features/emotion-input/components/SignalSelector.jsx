import React, { memo } from "react";

const SignalSelector = memo(function SignalSelector({
  legend,
  options,
  value,
  onChange,
  disabled = false
}) {
  return (
    <fieldset className="signal-selector" disabled={disabled}>
      <legend>{legend}</legend>
      <div className="signal-options">
        {options.map((option) => (
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

export default SignalSelector;
