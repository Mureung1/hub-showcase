import { useCallback, useMemo, useState } from "react";
import Stepper from "./components/Stepper.jsx";
import JobTargetSelect from "./features/jobTarget/JobTargetSelect.jsx";
import { getJobPosting, JOB_POSTINGS } from "./features/jobTarget/jobPostings.js";
import CvUpload from "./features/cvUpload/CvUpload.jsx";
import { parseCv } from "./features/cvUpload/parseCv.js";
import DesignSelect from "./features/designSelect/DesignSelect.jsx";
import { THEMES, DEFAULT_THEME, getTheme } from "./features/designSelect/themes.js";
import AiGenerating from "./features/generate/AiGenerating.jsx";
import ResultView from "./features/result/ResultView.jsx";
import frontendSample from "../samples/kim-jiwoo-frontend.md?raw";
import designerSample from "../samples/kim-seoyeon-designer.md?raw";
import marketerSample from "../samples/lee-marketing.md?raw";
import pmSample from "../samples/park-pm.md?raw";

const SAMPLES = [
  { label: "🧑‍💻 개발자", md: frontendSample },
  { label: "🎨 디자이너", md: designerSample },
  { label: "📈 마케터", md: marketerSample },
  { label: "🗂️ 기획자", md: pmSample },
];

// 앱 전체 흐름을 관리하는 오케스트레이터.
// 단계: target → upload → design → generate → result
export default function App() {
  const [step, setStep] = useState("target");
  const [jobTargetId, setJobTargetId] = useState("");
  const [cvText, setCvText] = useState("");
  const [designSlug, setDesignSlug] = useState(DEFAULT_THEME.slug);
  const [html, setHtml] = useState("");
  const [generation, setGeneration] = useState(null);

  const parsed = useMemo(() => parseCv(cvText), [cvText]);
  const cvReady = cvText.trim().length > 0;
  const theme = getTheme(designSlug);
  const jobTarget = getJobPosting(jobTargetId);

  const handleGenerated = useCallback((result) => {
    setHtml(result.html);
    setGeneration({ source: result.source, notice: result.notice });
    setStep("result");
  }, []);

  function restart() {
    setHtml("");
    setGeneration(null);
    setStep("target");
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>
          CV → 포트폴리오 생성기 <span className="tag">prototype</span>
        </h1>
        <p className="sub">
          지원할 기업과 공고를 고르면, 내 경험을 JD에 맞춰 포트폴리오로 만듭니다.
        </p>
      </header>

      <Stepper current={step} onStep={setStep} />

      <main className="stage">
        {step === "target" && (
          <>
            <JobTargetSelect
              postings={JOB_POSTINGS}
              selectedId={jobTargetId}
              onSelect={setJobTargetId}
            />
            <div className="stage-nav">
              <span />
              <button
                className="btn primary"
                disabled={!jobTarget}
                onClick={() => setStep("upload")}
              >
                다음: CV 입력 →
              </button>
            </div>
          </>
        )}

        {step === "upload" && (
          <>
            <CvUpload
              text={cvText}
              onText={setCvText}
              parsed={parsed}
              samples={SAMPLES}
            />
            <div className="stage-nav">
              <button className="btn" onClick={() => setStep("target")}>
                ← 이전
              </button>
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
          <AiGenerating
            cv={parsed}
            cvMarkdown={cvText}
            theme={theme}
            jobTarget={jobTarget}
            onDone={handleGenerated}
          />
        )}

        {step === "result" && (
          <ResultView
            html={html}
            cv={parsed}
            theme={theme}
            jobTarget={jobTarget}
            generation={generation}
            onRestart={restart}
            onChangeDesign={() => setStep("design")}
          />
        )}
      </main>
    </div>
  );
}
