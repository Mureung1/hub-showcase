import { useEffect, useState } from "react";
import { generatePortfolio } from "./generatePortfolio.js";
import "./generating.css";

// 3단계: "AI가 작성" 단계.
// 프로토타입에서는 결정적 렌더러가 즉시 HTML을 만들지만,
// 실제 생성 과정을 흉내 내는 단계별 진행 표시를 보여준다.
const STAGES = [
  "CV 구조 분석 중…",
  "디자인 토큰 적용 중…",
  "섹션 레이아웃 구성 중…",
  "HTML 페이지 조립 중…",
];

export default function Generating({ cv, theme, onDone }) {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    let alive = true;
    const timers = STAGES.map((_, i) =>
      setTimeout(() => alive && setStage(i), i * 480)
    );
    const done = setTimeout(() => {
      if (!alive) return;
      onDone(generatePortfolio(cv, theme));
    }, STAGES.length * 480 + 350);

    return () => {
      alive = false;
      timers.forEach(clearTimeout);
      clearTimeout(done);
    };
  }, [cv, theme, onDone]);

  return (
    <div className="generating">
      <div className="spinner" aria-hidden="true" />
      <p className="gen-title">
        ✨ <b>{theme.name}</b> 스타일로 포트폴리오 생성 중
      </p>
      <ul className="gen-stages">
        {STAGES.map((s, i) => (
          <li key={s} className={i < stage ? "done" : i === stage ? "on" : ""}>
            <span className="gen-mark">{i < stage ? "✓" : "•"}</span>
            {s}
          </li>
        ))}
      </ul>
    </div>
  );
}
