import React from "react";

function clamp(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.min(max, Math.max(min, number));
}

export default function ProgressBar({
  label,
  ariaLabel = label,
  value,
  min = 0,
  max = 100,
  role = "progressbar",
  tone = "default",
  size = "medium",
  showValue = true,
  valueFormatter = (currentValue) => `${Math.round(currentValue)}%`
}) {
  const safeMin = Number.isFinite(Number(min)) ? Number(min) : 0;
  const safeMax =
    Number.isFinite(Number(max)) && Number(max) > safeMin
      ? Number(max)
      : safeMin + 100;
  const safeValue = clamp(value, safeMin, safeMax);
  const percentage = ((safeValue - safeMin) / (safeMax - safeMin)) * 100;

  return (
    <div className={`progress-bar progress-bar-${size}`}>
      {(label || showValue) && (
        <div className="progress-bar-heading">
          {label && <span>{label}</span>}
          {showValue && <strong>{valueFormatter(safeValue)}</strong>}
        </div>
      )}
      <div
        className="progress-bar-track"
        role={role}
        aria-label={ariaLabel}
        aria-valuemin={safeMin}
        aria-valuemax={safeMax}
        aria-valuenow={safeValue}
      >
        <span
          className={`progress-bar-fill progress-bar-tone-${tone}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
