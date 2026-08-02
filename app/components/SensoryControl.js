"use client";

import { useState } from "react";

// T24: docs/prototype/feature-proposals.html 03번 프레임(다이얼) 디자인 기반.
// intensity(0~100, 차분하게~생기있게)가 색 채도·애니메이션·소리 볼륨을 함께 조절한다.
// 소리는 다이얼과 별도로 스피커 아이콘으로 켜고 끈다(상황에 따라 소리만 끄고 싶을 수 있어서).
function captionFor(intensity) {
  if (intensity < 34) return "지금은 차분한 쪽으로 맞췄어요";
  if (intensity > 66) return "지금은 생기있는 쪽으로 맞췄어요";
  return "지금은 중간 정도로 맞췄어요";
}

function GearIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="3" stroke="var(--ink-soft)" strokeWidth="1.6" />
      <path
        d="M12 3v2M12 19v2M21 12h-2M5 12H3M18.4 5.6l-1.4 1.4M7 17l-1.4 1.4M18.4 18.4L17 17M7 7 5.6 5.6"
        stroke="var(--ink-soft)"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SpeakerIcon({ on }) {
  const stroke = on ? "var(--ink)" : "var(--ink-faint)";
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M4 9v6h4l6 4V5L8 9H4z" stroke={stroke} strokeWidth="1.6" strokeLinejoin="round" />
      {on && <path d="M17 9c1 1 1 5 0 6" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" />}
    </svg>
  );
}

export default function SensoryControl({ intensity, onIntensityChange, soundEnabled, onToggleSound }) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="감각 강도 조절"
        title="감각 강도 조절"
        style={{
          width: "28px",
          height: "28px",
          borderRadius: "50%",
          border: "1px solid var(--cream-line)",
          background: "var(--white)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
        }}
      >
        <GearIcon />
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "36px",
            right: 0,
            width: "220px",
            padding: "18px 20px 16px",
            background: "var(--white)",
            border: "1px solid var(--cream-line)",
            borderRadius: "16px",
            boxShadow: "0 12px 30px -18px rgba(62,51,44,0.35)",
            zIndex: 20,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "11px",
              color: "var(--ink-soft)",
              marginBottom: "14px",
            }}
          >
            <span>차분하게</span>
            <span>생기있게</span>
          </div>
          <div style={{ position: "relative", height: "2px", background: "var(--cream-line)", borderRadius: "2px" }}>
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                height: "2px",
                width: `${intensity}%`,
                background: "var(--rose-line)",
                borderRadius: "2px",
              }}
            />
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: `${intensity}%`,
                width: "16px",
                height: "16px",
                marginTop: "-8px",
                marginLeft: "-8px",
                borderRadius: "50%",
                background: "var(--white)",
                border: "2px solid var(--rose-ink)",
                pointerEvents: "none",
              }}
            />
            <input
              type="range"
              min={0}
              max={100}
              value={intensity}
              onChange={(e) => onIntensityChange(Number(e.target.value))}
              aria-label="감각 강도"
              style={{
                position: "absolute",
                top: "-9px",
                left: 0,
                width: "100%",
                height: "20px",
                opacity: 0,
                margin: 0,
                cursor: "pointer",
              }}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "22px" }}>
            <div style={{ width: "48px", height: "48px", borderRadius: "10px", background: "var(--sky)", border: "1px solid var(--sky-line)" }} />
            <div style={{ width: "48px", height: "48px", borderRadius: "10px", background: "var(--lavender)", border: "1px solid var(--lavender-line)" }} />
            <div style={{ width: "48px", height: "48px", borderRadius: "10px", background: "var(--rose)", border: "1px solid var(--rose-line)" }} />
          </div>

          <p style={{ textAlign: "center", fontSize: "12px", color: "var(--ink-soft)", marginTop: "12px" }}>
            {captionFor(intensity)}
          </p>

          <button
            onClick={onToggleSound}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              width: "100%",
              justifyContent: "center",
              marginTop: "14px",
              padding: "8px",
              borderRadius: "100px",
              border: "1px solid var(--cream-line)",
              background: soundEnabled ? "var(--cream)" : "transparent",
              cursor: "pointer",
              fontSize: "12px",
              color: "var(--ink)",
              fontFamily: "var(--font-body)",
            }}
          >
            <SpeakerIcon on={soundEnabled} />
            {soundEnabled ? "소리 켜짐" : "소리 꺼짐"}
          </button>
        </div>
      )}
    </div>
  );
}
