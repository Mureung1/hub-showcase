import { useCallback, useMemo, useState } from "react";
import Stepper from "./components/Stepper.jsx";
import CvUpload from "./features/cvUpload/CvUpload.jsx";
import { parseCv } from "./features/cvUpload/parseCv.js";
import DesignSelect from "./features/designSelect/DesignSelect.jsx";
import { THEMES, DEFAULT_THEME, getTheme } from "./features/designSelect/themes.js";
import Generating from "./features/generate/Generating.jsx";
import ResultView from "./features/result/ResultView.jsx";
import frontendSample from "../samples/kim-jiwoo-frontend.md?raw";
import designerSample from "../samples/kim-seoyeon-designer.md?raw";

const SAMPLES = [
  { label: "🧑‍💻 개발자 샘플", md: frontendSample },
  { label: "🎨 디자이너 샘플", md: designerSample },
];

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

      <Stepper current={step} onStep={setStep} />

      <main className="stage">
        {step === "upload" && (
          <>
            <CvUpload
              text={cvText}
              onText={setCvText}
              parsed={parsed}
              samples={SAMPLES}
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
          <ResultView
            html={html}
            cv={parsed}
            theme={theme}
            onRestart={restart}
            onChangeDesign={() => setStep("design")}
          />
        )}
      </main>
    </div>
  );
}
