import { useEffect, useState } from "react";
import { generateWithFallback } from "./generateWithFallback.js";
import "./generating.css";

const STAGES = [
  "CV 구조 분석 중…",
  "선택한 디자인 지침 전달 중…",
  "서버 AI 생성 요청 중…",
  "HTML 결과 검증 중…",
];

export default function AiGenerating({ cv, cvMarkdown, theme, onDone }) {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    let alive = true;
    const controller = new AbortController();
    const progress = setInterval(() => {
      setStage((current) => Math.min(current + 1, STAGES.length - 1));
    }, 480);

    generateWithFallback({
      cv,
      cvMarkdown,
      theme,
      signal: controller.signal,
    })
      .then((result) => {
        if (alive) onDone(result);
      })
      .catch((error) => {
        if (error.name !== "AbortError") throw error;
      });

    return () => {
      alive = false;
      controller.abort();
      clearInterval(progress);
    };
  }, [cv, cvMarkdown, theme, onDone]);

  return (
    <div className="generating" role="status" aria-live="polite">
      <div className="spinner" aria-hidden="true" />
      <p className="gen-title">
        <b>{theme.name}</b> 스타일로 포트폴리오 생성 중
      </p>
      <ul className="gen-stages">
        {STAGES.map((label, index) => (
          <li key={label} className={index < stage ? "done" : index === stage ? "on" : ""}>
            <span className="gen-mark">{index < stage ? "✓" : "•"}</span>
            {label}
          </li>
        ))}
      </ul>
    </div>
  );
}
