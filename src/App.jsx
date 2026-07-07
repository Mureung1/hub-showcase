import { useCallback, useMemo, useState } from "react";
import Stepper from "./components/Stepper.jsx";
import CvUpload from "./features/cvUpload/CvUpload.jsx";
import { parseCv } from "./features/cvUpload/parseCv.js";
import DesignSelect from "./features/designSelect/DesignSelect.jsx";
import { THEMES, DEFAULT_THEME, getTheme } from "./features/designSelect/themes.js";
import Generating from "./features/generate/Generating.jsx";

const BUILTIN_SAMPLE = `# 김지수
Frontend Engineer
jisu.kim@example.com · github.com/jisu-dev · 서울

## Summary
사용자 경험을 중시하는 3년차 프론트엔드 개발자입니다. React와 TypeScript로 대시보드와 커머스 서비스를 만들었습니다.

## Skills
React, TypeScript, Next.js, Vite, Zustand, Testing Library, Figma

## Experience
### 토스랩 — Frontend Engineer (2022.03 - 현재)
- 잔디 웹 대시보드 리뉴얼, 초기 렌더 40% 단축
- 디자인 시스템 컴포넌트 60여 개 구축

### 스타트업 A — 프론트엔드 (2021.01 - 2022.02)
- 커머스 상품 페이지 개발, 전환율 12% 개선

## Projects
### 오픈소스 차트 라이브러리
- 주간 다운로드 3천 건, GitHub 스타 400+

## Education
- 한국대학교 컴퓨터공학 학사 (2017 - 2021)
`;

// 앱 전체 흐름을 관리하는 오케스트레이터.
// 단계: upload → design → generate → result
export default function App() {
  const [step, setStep] = useState("upload");
  const [cvText, setCvText] = useState("");
  const [designSlug, setDesignSlug] = useState(DEFAULT_THEME.slug);
  const [html, setHtml] = useState("");

  const parsed = useMemo(() => parseCv(cvText), [cvText]);
  const cvReady = cvText.trim().length > 0;
  const theme = getTheme(designSlug);

  const handleGenerated = useCallback((generatedHtml) => {
    setHtml(generatedHtml);
    setStep("result");
  }, []);

  function restart() {
    setHtml("");
    setStep("upload");
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>
          CV → 포트폴리오 생성기 <span className="tag">prototype</span>
        </h1>
        <p className="sub">
          이력서를 올리고 디자인을 고르면, 포트폴리오 사이트를 만들어 드립니다.
        </p>
      </header>

      <Stepper current={step} />

      <main className="stage">
        {step === "upload" && (
          <>
            <CvUpload
              text={cvText}
              onText={setCvText}
              parsed={parsed}
              samples={[{ label: "🙋 샘플 CV 불러오기", md: BUILTIN_SAMPLE }]}
            />
            <div className="stage-nav">
              <span />
              <button
                className="btn primary"
                disabled={!cvReady}
                onClick={() => setStep("design")}
              >
                다음: 디자인 선택 →
              </button>
            </div>
          </>
        )}

        {step === "design" && (
          <>
            <DesignSelect
              themes={THEMES}
              selected={designSlug}
              onSelect={setDesignSlug}
            />
            <div className="stage-nav">
              <button className="btn" onClick={() => setStep("upload")}>
                ← 이전
              </button>
              <button className="btn primary" onClick={() => setStep("generate")}>
                이 디자인으로 생성 →
              </button>
            </div>
          </>
        )}

        {step === "generate" && (
          <Generating cv={parsed} theme={theme} onDone={handleGenerated} />
        )}

        {step === "result" && (
          <div>
            <iframe
              title="portfolio preview"
              srcDoc={html}
              style={{
                width: "100%",
                height: "560px",
                border: "1px solid var(--line)",
                borderRadius: "10px",
                background: "#fff",
              }}
            />
            <div className="stage-nav">
              <button className="btn" onClick={restart}>
                ↺ 새로 만들기
              </button>
              <span />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
