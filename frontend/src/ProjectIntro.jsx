import { useEffect, useMemo, useRef, useState } from "react";
import { MBTI_TYPES, SCORE_LABELS, STUDY_QUESTIONS, STRESS_QUESTIONS } from "./data/questions";
import { matchMethods } from "./data/mbtiMethodMatching";
import { buildDailySchedule } from "./lib/schedule";
import { deleteResults, getAnonId, listResults, saveResult as saveResultToServer } from "./lib/api";
import { ALGORITHM_VERSION, createRecommendations } from "./lib/recommendations";
import {
  calculateMethodAffinities,
  calculatePreferenceProfile,
  calculateScores,
  getSelectedOptionLabels,
} from "./lib/scoring";
import {
  clearStoredData,
  loadCalibration,
  loadFeedback,
  loadRecords,
  loadResult,
  saveCalibration,
  saveFeedback,
  saveRecord,
  saveResult,
} from "./lib/storage";

const RECALL_TARGET = 3; // 실천 카드가 목표로 하는 "핵심 3개"

const STEPS = ["소개", "MBTI", "공부 설문", "스트레스 설문", "결과", "실천 카드"];
const SCHEMA_VERSION = 1;

// 응답 처리 순서와 무관하게 같은 최종 입력이면 같은 지문을 만든다.
function buildInputFingerprint({ mbti, mbtiKnown, mbtiSource, studyAnswers, stressAnswers }) {
  const study = STUDY_QUESTIONS.map((question) => `${question.id}=${studyAnswers[question.id] ?? ""}`).join("&");
  const stress = STRESS_QUESTIONS.map((question) => `${question.id}=${stressAnswers[question.id] ?? ""}`).join("&");
  return [`mbti=${mbtiKnown ? mbti : "UNKNOWN"}`, `src=${mbtiSource}`, study, stress].join("|");
}

function Progress({ step }) {
  return (
    <div className="progress" aria-label="진행 단계">
      {STEPS.map((label, index) => (
        <span className={index <= step ? "progress-dot active" : "progress-dot"} key={label}>
          {label}
        </span>
      ))}
    </div>
  );
}

function OptionCard({ active, children, onClick }) {
  return (
    <button className={active ? "option-card selected" : "option-card"} onClick={onClick} type="button">
      {children}
    </button>
  );
}

function QuestionGroup({ answers, onAnswer, questions }) {
  return (
    <div className="question-list">
      {questions.map((question) => (
        <section className="question-card" key={question.id}>
          <p className="eyebrow">{question.title}</p>
          <h3>{question.prompt}</h3>
          <div className="option-grid">
            {question.options.map((option) => (
              <OptionCard
                active={answers[question.id] === option.id}
                key={option.id}
                onClick={() => onAnswer(question.id, option.id)}
              >
                {option.label}
              </OptionCard>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function ScoreBar({ label, value }) {
  return (
    <div className="score-row">
      <div>
        <strong>{label}</strong>
        <span>{value}점</span>
      </div>
      <div className="score-track">
        <span style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function isCompleteAnswers(questions, answers) {
  return questions.every((question) =>
    question.options.some((option) => option.id === answers[question.id]),
  );
}

function createResultId() {
  return globalThis.crypto?.randomUUID?.() ?? `result-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function ProjectIntro() {
  const [storedSnapshot] = useState(() => loadResult());
  const [storedRecords] = useState(() => loadRecords());
  const [storedFeedback] = useState(() => loadFeedback());
  const [storedCalibration] = useState(() => loadCalibration());
  const [step, setStep] = useState(0);
  const [resultId, setResultId] = useState(() => storedSnapshot?.resultId ?? createResultId());
  const [mbti, setMbti] = useState(() =>
    storedSnapshot?.profile?.mbti === "UNKNOWN" ? "" : (storedSnapshot?.profile?.mbti ?? ""),
  );
  const [mbtiSource, setMbtiSource] = useState(() =>
    storedSnapshot?.profile?.mbtiSource ??
    (storedSnapshot?.profile?.mbtiKnown ? "official-self-report" : "not-provided"),
  );
  const [studyAnswers, setStudyAnswers] = useState(() => storedSnapshot?.studyAnswers ?? {});
  const [stressAnswers, setStressAnswers] = useState(() => storedSnapshot?.stressAnswers ?? {});
  const [completed, setCompleted] = useState(false);
  const [focusLevel, setFocusLevel] = useState(3);
  const [fatigueLevel, setFatigueLevel] = useState(3);
  const [records, setRecords] = useState(storedRecords);
  const [fitScore, setFitScore] = useState(0);
  const [understandingScore, setUnderstandingScore] = useState(3);
  const [actionabilityScore, setActionabilityScore] = useState(3);
  const [feedbackNote, setFeedbackNote] = useState("");
  const [feedbackCount, setFeedbackCount] = useState(storedFeedback.length);
  const [recallPhase, setRecallPhase] = useState("predict"); // predict → recall → done
  const [recallPredicted, setRecallPredicted] = useState(null);
  const [recallActual, setRecallActual] = useState(null);
  const [calibrationCount, setCalibrationCount] = useState(storedCalibration.length);
  const [serverConsent, setServerConsent] = useState(false);
  const [serverMsg, setServerMsg] = useState("");
  const [serverCount, setServerCount] = useState(null);
  const mbtiKnown = mbtiSource === "official-self-report";

  const result = useMemo(() => {
    const methodAffinities = calculateMethodAffinities(studyAnswers, stressAnswers);
    const baselineScores = calculateScores({
      mbti,
      mbtiKnown,
      studyAnswers,
      stressAnswers,
      useMbtiHints: false,
    });
    const scores = calculateScores({ mbti, mbtiKnown, studyAnswers, stressAnswers });
    // 매칭 에이전트(a): 공식 MBTI 입력 시에만 논문 기반 매칭을 실제 추천 신호로 반영한다.
    const match = mbtiKnown && mbti ? matchMethods(mbti) : { temperament: null, adjustments: {}, reason: "", sources: [] };
    const baselineRecommendationResult = createRecommendations(baselineScores, methodAffinities);
    const recommendationResult = createRecommendations(scores, methodAffinities, match.adjustments);
    const preferenceProfile = calculatePreferenceProfile(studyAnswers);

    return {
      baselineScores,
      baselineRecommendations: baselineRecommendationResult.recommendations,
      preferenceProfile,
      scores,
      match,
      schedule: buildDailySchedule(recommendationResult.recommendations, recommendationResult.routine),
      ...recommendationResult,
    };
  }, [mbti, mbtiKnown, studyAnswers, stressAnswers]);

  const canContinueStudy = isCompleteAnswers(STUDY_QUESTIONS, studyAnswers);
  const canContinueStress = isCompleteAnswers(STRESS_QUESTIONS, stressAnswers);
  const hasCompleteResult =
    (mbtiSource === "not-provided" || (mbtiKnown && Boolean(mbti))) && canContinueStudy && canContinueStress;

  const inputFingerprint = useMemo(
    () => buildInputFingerprint({ mbti, mbtiKnown, mbtiSource, studyAnswers, stressAnswers }),
    [mbti, mbtiKnown, mbtiSource, studyAnswers, stressAnswers],
  );

  // 완결된 입력 지문 하나당 immutable (resultId, createdAt) 하나를 유지한다.
  // 입력이 바뀌면 새 결과로 보고 새 ID/생성시각을 발급해, 이전 피드백이 바뀐 결과에 섞이지 않게 한다.
  const resultLifecycleRef = useRef({
    fingerprint: storedSnapshot?.inputFingerprint ?? null,
    resultId: storedSnapshot?.resultId ?? resultId,
    createdAt: storedSnapshot?.profile?.createdAt ?? null,
  });

  useEffect(() => {
    if (!hasCompleteResult) {
      return;
    }
    const committed = resultLifecycleRef.current;
    if (committed.fingerprint === inputFingerprint) {
      return; // 이미 저장된 동일 입력 — updatedAt만 흔들지 않는다.
    }

    let activeResultId;
    if (committed.fingerprint === null && committed.createdAt === null) {
      activeResultId = resultId; // 이 세션 첫 완성: 현재 resultId를 그대로 확정한다.
    } else {
      activeResultId = createResultId(); // 입력이 바뀐 새 결과: 새 immutable ID.
      setResultId(activeResultId);
    }
    const createdAt = new Date().toISOString();
    resultLifecycleRef.current = { fingerprint: inputFingerprint, resultId: activeResultId, createdAt };

    saveResult({
      resultId: activeResultId,
      schemaVersion: SCHEMA_VERSION,
      inputFingerprint,
      profile: {
        mbti: mbtiKnown ? mbti : "UNKNOWN",
        mbtiKnown,
        mbtiSource,
        createdAt,
      },
      studyAnswers,
      stressAnswers,
      result,
    });
  }, [hasCompleteResult, inputFingerprint, mbti, mbtiKnown, mbtiSource, result, resultId, stressAnswers, studyAnswers]);

  const topScores = Object.entries(result.scores)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  function continueWithoutOfficialMbti() {
    setMbti("");
    setMbtiSource("not-provided");
    setStep(2);
  }

  function handleRecordSave() {
    const next = saveRecord({
      algorithmVersion: ALGORITHM_VERSION,
      completed,
      fatigueLevel,
      focusLevel,
      resultId,
    });
    setRecords(next);
  }

  function resetRecall() {
    setRecallPhase("predict");
    setRecallPredicted(null);
    setRecallActual(null);
  }

  function handleCalibrationSave() {
    if (recallPredicted === null || recallActual === null) {
      return;
    }
    const next = saveCalibration({
      algorithmVersion: ALGORITHM_VERSION,
      resultId,
      target: RECALL_TARGET,
      predicted: recallPredicted,
      actual: recallActual,
      calibrationError: Math.abs(recallPredicted - recallActual),
    });
    setCalibrationCount(next.length);
    setRecallPhase("done");
  }

  async function handleServerSave() {
    if (!serverConsent) {
      return;
    }
    try {
      await saveResultToServer({
        consent: true,
        anonId: getAnonId(),
        mbti: mbtiKnown ? mbti : null,
        temperament: result.match?.temperament ?? null,
        matchedMethods: result.recommendations.map((item) => item.id),
        baselineMethods: result.baselineRecommendations.map((item) => item.id),
        fitScore,
        understanding: understandingScore,
        actionability: actionabilityScore,
        focus: focusLevel,
        fatigue: fatigueLevel,
        calibrationError:
          recallPredicted !== null && recallActual !== null ? Math.abs(recallPredicted - recallActual) : null,
        algorithmVersion: ALGORITHM_VERSION,
      });
      const rows = await listResults(getAnonId());
      setServerCount(rows.length);
      setServerMsg("서버에 익명 요약을 저장했습니다.");
    } catch {
      setServerMsg("서버 연결 실패 — 앱은 계속 사용할 수 있습니다(로컬 저장은 유지).");
    }
  }

  async function handleServerList() {
    try {
      const rows = await listResults(getAnonId());
      setServerCount(rows.length);
      setServerMsg(`서버에 내 익명 기록 ${rows.length}개가 있습니다.`);
    } catch {
      setServerMsg("서버 연결 실패 — 조회할 수 없습니다.");
    }
  }

  async function handleServerDelete() {
    try {
      const res = await deleteResults(getAnonId());
      setServerCount(0);
      setServerMsg(`서버에서 내 익명 기록 ${res.removed}개를 삭제했습니다.`);
    } catch {
      setServerMsg("서버 연결 실패 — 삭제할 수 없습니다.");
    }
  }

  function handleFeedbackSave() {
    if (!fitScore) {
      return;
    }

    const next = saveFeedback({
      algorithmVersion: ALGORITHM_VERSION,
      assessmentSource: mbtiSource,
      baselineTopRecommendations: result.baselineRecommendations.map((item) => item.id),
      actionabilityScore,
      fitScore,
      note: feedbackNote.trim(),
      officialMbti: mbtiKnown ? mbti : null,
      preferenceSignalCode: result.preferenceProfile.code,
      resultId,
      topRecommendations: result.recommendations.map((item) => item.id),
      understandingScore,
    });
    setFeedbackCount(next.length);
    setFeedbackNote("");
  }

  function resetFlow() {
    const freshId = createResultId();
    resultLifecycleRef.current = { fingerprint: null, resultId: freshId, createdAt: null };
    setMbti("");
    setMbtiSource("");
    setResultId(freshId);
    setStudyAnswers({});
    setStressAnswers({});
    setCompleted(false);
    setFocusLevel(3);
    setFatigueLevel(3);
    setFitScore(0);
    setUnderstandingScore(3);
    setActionabilityScore(3);
    setFeedbackNote("");
    resetRecall();
    setStep(1);
  }

  function handleStoredDataClear() {
    if (!window.confirm("이 브라우저에 저장된 결과, 루틴 기록, 추천 평가를 모두 삭제할까요?")) {
      return;
    }

    clearStoredData();
    const freshId = createResultId();
    resultLifecycleRef.current = { fingerprint: null, resultId: freshId, createdAt: null };
    setMbti("");
    setMbtiSource("");
    setResultId(freshId);
    setStudyAnswers({});
    setStressAnswers({});
    setCompleted(false);
    setFocusLevel(3);
    setFatigueLevel(3);
    setRecords([]);
    setFitScore(0);
    setUnderstandingScore(3);
    setActionabilityScore(3);
    setFeedbackNote("");
    setFeedbackCount(0);
    resetRecall();
    setCalibrationCount(0);
    setStep(0);
  }

  return (
    <main className="study-app">
      <style>{`
        /* ── 디자인 토큰: docs/design.md §2~§4 ── */
        #root{width:100%;max-width:100%;margin:0;border:0;text-align:left;display:block;min-height:100svh;}
        /* ── 크림 배경 · 블루 세리프(Bookman) 제목 · 블루 스크립트 악센트 ── */
        :root{
          --bg:#f8f2e3;--surface:#fdfbf3;--surface-muted:#f1e9d5;
          --tint-blue:#e7ecf6;--on-tint-blue:#274f8c;
          --tint-green:#e8efd9;--on-tint-green:#4c7a3f;
          --tint-lav:#ece7f1;--on-tint-lav:#5a52a0;
          --primary:#2f62b3;--primary-strong:#244e8f;--on-primary:#fdfbf3;
          --accent:#5a8f4a;--accent-strong:#466f39;--on-accent:#fdfbf3;
          --text-strong:#213a63;--text:#454a53;--text-muted:#8a8266;
          --border:#e2d8c0;--border-soft:#ece4d1;--focus:#2f62b3;
          --shadow-sm:0 1px 3px rgba(90,70,25,.07),0 1px 2px rgba(90,70,25,.05);
          --shadow-md:0 8px 24px rgba(90,70,25,.10);
          --font:-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo","Segoe UI",Roboto,"Malgun Gothic",system-ui,sans-serif;
          --font-display:"Bookman Old Style",Bookman,"URW Bookman L","Georgia","Times New Roman",serif;
          --font-script:"Snell Roundhand","Brush Script MT","Segoe Script","Apple Chancery",cursive;
          --r-sm:10px;--r-md:14px;--r-lg:20px;--r-pill:999px;
        }
        @media (prefers-color-scheme:dark){:root{
          --bg:#141a24;--surface:#1b2430;--surface-muted:#212c3a;
          --tint-blue:#1c2a44;--on-tint-blue:#a7c2ee;
          --tint-green:#1e3320;--on-tint-green:#8ecb83;
          --tint-lav:#262445;--on-tint-lav:#bcb4ee;
          --primary:#5a92e6;--primary-strong:#7aa9ee;--on-primary:#0e141d;
          --accent:#7ab86a;--accent-strong:#93c986;--on-accent:#0e141d;
          --text-strong:#f2ecdb;--text:#c9cdd6;--text-muted:#98917f;
          --border:#2c3745;--border-soft:#232d3a;--focus:#5a92e6;
          --shadow-sm:0 1px 3px rgba(0,0,0,.4);--shadow-md:0 10px 28px rgba(0,0,0,.45);
        }}
        /* ── 레이아웃 ── */
        .study-app{position:relative;min-height:100svh;background:var(--bg);color:var(--text);font-family:var(--font);-webkit-font-smoothing:antialiased;}
        /* 포스터 느낌의 블루 프레임 */
        .study-app::after{content:"";position:fixed;inset:12px;border:2px solid var(--primary);border-radius:6px;pointer-events:none;z-index:40;opacity:.5;}
        .shell{position:relative;z-index:1;width:min(720px,calc(100% - 56px));margin:0 auto;padding:30px 0 54px;}
        .topbar{display:flex;justify-content:space-between;gap:12px;align-items:center;margin-bottom:20px;}
        .brand{font-family:var(--font-display);font-weight:700;font-size:17px;letter-spacing:.01em;color:var(--primary);}
        /* 블루 스크립트(Brush) 악센트 */
        .script-accent{font-family:var(--font-script);color:var(--primary);font-size:clamp(26px,4.5vw,40px);line-height:.9;margin:0 0 -6px;font-weight:400;}
        .pill{border:1px solid var(--border);background:var(--surface);color:var(--text-muted);border-radius:var(--r-pill);padding:7px 12px;font-size:12px;font-weight:600;}
        /* ── 진행 표시 ── */
        .progress{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:18px;}
        .progress-dot{border:1px solid var(--border);background:var(--surface);color:var(--text-muted);border-radius:var(--r-pill);padding:7px 11px;font-size:12px;font-weight:700;}
        .progress-dot.active{background:var(--primary);color:var(--on-primary);border-color:var(--primary);}
        /* ── 카드/패널 ── */
        .panel{background:var(--surface);border:1px solid var(--border);border-radius:var(--r-lg);box-shadow:var(--shadow-sm);padding:24px;}
        .hero{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(280px,.95fr);gap:24px;align-items:center;}
        /* ── 타이포 ── */
        .eyebrow{margin:0 0 10px;color:var(--text-muted);font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;}
        h1,h2,h3{letter-spacing:0;color:var(--text-strong);}
        h1{font-family:var(--font-display);font-size:clamp(32px,6.2vw,56px);line-height:1.05;margin:0 0 16px;font-weight:700;color:var(--primary);}
        h2{font-family:var(--font-display);font-size:clamp(24px,3.2vw,34px);line-height:1.14;margin:0 0 12px;font-weight:700;color:var(--primary);}
        h3{font-family:var(--font-display);font-size:19px;line-height:1.3;margin:0 0 12px;font-weight:700;}
        p{margin:0;line-height:1.6;color:var(--text);}
        .lead{font-size:18px;max-width:640px;margin:0 0 16px;}
        .notice{background:var(--tint-green);padding:14px 16px;border-radius:var(--r-md);color:var(--on-tint-green);margin-top:16px;font-size:14px;line-height:1.55;}
        .hint{margin-top:12px;font-size:13px;color:var(--text-muted);line-height:1.5;}
        /* ── 히어로 강조 카드(학습=블루) ── */
        .hero-card{background:var(--tint-blue);color:var(--on-tint-blue);border-radius:var(--r-lg);padding:20px;display:grid;gap:14px;}
        .hero-card p{color:var(--on-tint-blue);}
        .hero-card .eyebrow{color:var(--on-tint-blue);opacity:.85;}
        .mini-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;}
        .mini{background:var(--surface);color:var(--text-strong);border-radius:var(--r-md);padding:12px 8px;font-weight:700;text-align:center;font-size:13px;box-shadow:var(--shadow-sm);}
        /* ── 버튼 ── */
        .actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:22px;}
        button{font:inherit;}
        .primary,.secondary{border:0;border-radius:var(--r-md);padding:13px 18px;font-weight:700;cursor:pointer;min-height:46px;transition:background .15s,border-color .15s;}
        .primary{background:var(--primary);color:var(--on-primary);}
        .primary:hover:not(:disabled){background:var(--primary-strong);}
        .primary:disabled{opacity:.45;cursor:not-allowed;}
        .secondary{background:var(--surface-muted);color:var(--text-strong);border:1px solid var(--border);}
        .secondary:hover{border-color:var(--primary);}
        .primary:focus-visible,.secondary:focus-visible,.option-card:focus-visible{outline:2px solid var(--focus);outline-offset:2px;}
        /* ── 옵션/선택 ── */
        .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px;}
        .option-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;}
        .source-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:20px;}
        .option-card{border:1px solid var(--border);background:var(--surface);border-radius:var(--r-md);padding:13px 14px;text-align:left;color:var(--text-strong);cursor:pointer;font-weight:600;min-height:52px;transition:border-color .15s,background .15s;}
        .option-card:hover{border-color:var(--primary);}
        .option-card.selected{border-color:var(--primary);background:var(--tint-blue);color:var(--on-tint-blue);font-weight:700;}
        .question-list{display:grid;gap:14px;margin-top:20px;}
        .question-card,.result-card{border:1px solid var(--border);background:var(--surface);border-radius:var(--r-lg);padding:20px;}
        /* ── 결과 ── */
        .result-layout{display:grid;grid-template-columns:minmax(0,.9fr) minmax(300px,1.1fr);gap:16px;margin-top:18px;}
        .score-list{display:grid;gap:12px;}
        .score-row>div:first-child{display:flex;justify-content:space-between;gap:10px;font-size:14px;margin-bottom:6px;color:var(--text-strong);font-weight:600;}
        .score-track{height:9px;border-radius:var(--r-pill);background:var(--surface-muted);overflow:hidden;}
        .score-track span{display:block;height:100%;background:linear-gradient(90deg,var(--primary),var(--accent));border-radius:var(--r-pill);}
        .card-list{display:grid;gap:12px;}
        .method{border:1px solid var(--border);border-radius:var(--r-md);padding:16px;background:var(--surface-muted);}
        .method strong{display:block;color:var(--text-strong);font-size:16px;margin-bottom:8px;}
        .method p{margin:6px 0 0;font-size:14px;}
        .two-col{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:16px;}
        ul{margin:10px 0 0;padding-left:18px;color:var(--text);line-height:1.7;}
        /* ── 실천 카드 ── */
        .routine{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:18px;}
        .checkline{display:flex;align-items:center;gap:10px;margin-top:16px;font-weight:700;color:var(--text-strong);}
        .checkline input{width:20px;height:20px;accent-color:var(--accent);}
        .range-group{display:grid;gap:12px;margin-top:16px;}
        .range-row{display:grid;grid-template-columns:64px 1fr 28px;gap:10px;align-items:center;color:var(--text-strong);font-weight:600;}
        input[type="range"]{accent-color:var(--primary);}
        .saved{margin-top:14px;color:var(--accent-strong);font-weight:700;font-size:14px;}
        .feedback-card{margin-top:16px;border:1px solid var(--border);background:var(--surface-muted);border-radius:var(--r-lg);padding:20px;}
        .signal-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-top:12px;}
        .signal-item{border:1px solid var(--border);background:var(--surface);border-radius:var(--r-md);padding:12px;}
        .signal-item strong{display:block;color:var(--text-strong);margin-bottom:4px;}
        .rating-grid{display:grid;grid-template-columns:repeat(5,minmax(44px,1fr));gap:8px;margin-top:14px;}
        .rating-grid .option-card{text-align:center;padding:10px;min-height:44px;}
        textarea{width:100%;min-height:84px;margin-top:12px;resize:vertical;border:1px solid var(--border);border-radius:var(--r-md);background:var(--surface);color:var(--text-strong);font:inherit;padding:12px;box-sizing:border-box;}
        textarea:focus-visible{outline:2px solid var(--focus);outline-offset:2px;}
        /* ── 칩 ── */
        .answers{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px;}
        .answer-chip{background:var(--tint-blue);color:var(--on-tint-blue);border-radius:var(--r-pill);padding:6px 11px;font-size:12px;font-weight:600;}
        @media (max-width:860px){.hero,.result-layout,.routine,.two-col,.source-grid,.signal-grid{grid-template-columns:1fr}.panel{padding:18px}.topbar{align-items:flex-start;flex-direction:column}.mini-grid{grid-template-columns:1fr 1fr} }
      `}</style>

      <div className="shell">
        <div className="topbar">
          <div className="brand">MBTI 기반 공부법 및 스트레스 관리 웹앱</div>
          <div className="pill">Vite + React · 규칙 기반 추천 · localStorage</div>
        </div>

        <Progress step={step} />

        {step === 0 && (
          <section className="panel hero">
            <div>
              <p className="eyebrow">Study routine prototype</p>
              <p className="script-accent">Study &amp; Recover</p>
              <h1>나에게 맞는 공부·회복 루틴을 오늘 바로 찾기</h1>
              <p className="lead">
                MBTI와 공부·스트레스 설문을 함께 보고, 성향을 단정하지 않은 채 학습 선호와 피로 패턴을 행동지표로 정리합니다.
              </p>
              <div className="notice">
                MBTI는 사람을 고정적으로 판단하는 도구가 아니라 학습 선호를 탐색하는 출발점입니다. 스트레스 기능은 피로 신호와 회복 루틴을 다루는 생활관리 기능입니다.
              </div>
              <p className="hint">현재 점수와 추천은 검증된 심리검사나 진단 결과가 아니라, 설명 가능한 규칙 기반 프로토타입의 시도 제안입니다.</p>
              <div className="actions">
                <button className="primary" onClick={() => setStep(1)} type="button">
                  시작하기
                </button>
                {hasCompleteResult && (
                  <button className="secondary" onClick={() => setStep(4)} type="button">
                    이전 결과 이어보기
                  </button>
                )}
                {(hasCompleteResult || records.length > 0 || feedbackCount > 0) && (
                  <button className="secondary" onClick={handleStoredDataClear} type="button">
                    이 브라우저의 저장 데이터 삭제
                  </button>
                )}
              </div>
            </div>
            <div className="hero-card">
              <p className="eyebrow">핵심 기능</p>
              <div className="mini-grid">
                <div className="mini">성향·상태 점검</div>
                <div className="mini">학습법 매칭</div>
                <div className="mini">오늘의 루틴</div>
                <div className="mini">baseline 비교</div>
              </div>
              <p>
                추천은 MBTI 유형명만으로 정하지 않습니다. 공부 성향과 스트레스 반응을 함께 반영해 추천 이유를 표시합니다.
              </p>
            </div>
          </section>
        )}

        {step === 1 && (
          <section className="panel">
            <p className="eyebrow">Step 1</p>
            <h2>공식 MBTI 결과 사용 여부</h2>
            <p>이 앱은 공식 문항을 제공하거나 재현하지 않습니다. 공식 MBTI 평가에서 이미 받은 결과가 있다면 직접 입력하고, 없다면 공부습관 자체 점검만으로 진행합니다.</p>
            <div className="source-grid">
              <OptionCard
                active={mbtiSource === "official-self-report"}
                onClick={() => setMbtiSource("official-self-report")}
              >
                공식 MBTI 결과를 입력할게요
              </OptionCard>
              <OptionCard active={mbtiSource === "not-provided"} onClick={continueWithoutOfficialMbti}>
                공식 결과 없이 진행할게요
              </OptionCard>
            </div>
            {mbtiSource === "official-self-report" && (
              <>
                <p className="hint">아래 값은 사용자가 보유한 공식 결과를 기록하는 입력이며, 이 앱이 새로 판정한 결과가 아닙니다.</p>
                <div className="grid" style={{ marginTop: 16 }}>
                  {MBTI_TYPES.map((type) => (
                    <OptionCard active={mbti === type} key={type} onClick={() => setMbti(type)}>
                      {type}
                    </OptionCard>
                  ))}
                </div>
              </>
            )}
            <div className="actions">
              <button
                className="primary"
                disabled={mbtiSource !== "official-self-report" || !mbti}
                onClick={() => setStep(2)}
                type="button"
              >
                공부 설문으로 이동
              </button>
            </div>
          </section>
        )}

        {step === 2 && (
          <section className="panel">
            <p className="eyebrow">Step 2</p>
            <h2>공부 성향 설문</h2>
            <p>집중·이해·판단·복습·계획 방식을 묻는 짧은 자체 문항입니다. 일부 문항은 4축 선호의 탐색 신호를 만들지만 공식 MBTI 판정에는 사용하지 않습니다.</p>
            <QuestionGroup
              answers={studyAnswers}
              onAnswer={(questionId, optionId) => setStudyAnswers((prev) => ({ ...prev, [questionId]: optionId }))}
              questions={STUDY_QUESTIONS}
            />
            <div className="actions">
              <button className="secondary" onClick={() => setStep(1)} type="button">
                이전
              </button>
              <button className="primary" disabled={!canContinueStudy} onClick={() => setStep(3)} type="button">
                스트레스 설문으로 이동
              </button>
            </div>
          </section>
        )}

        {step === 3 && (
          <section className="panel">
            <p className="eyebrow">Step 3</p>
            <h2>스트레스 반응 설문</h2>
            <p>피로 신호, 자책 반응, 회복 방식, 계획이 밀렸을 때의 반응을 고르세요.</p>
            <QuestionGroup
              answers={stressAnswers}
              onAnswer={(questionId, optionId) => setStressAnswers((prev) => ({ ...prev, [questionId]: optionId }))}
              questions={STRESS_QUESTIONS}
            />
            <div className="actions">
              <button className="secondary" onClick={() => setStep(2)} type="button">
                이전
              </button>
              <button className="primary" disabled={!canContinueStress} onClick={() => setStep(4)} type="button">
                결과 보기
              </button>
            </div>
          </section>
        )}

        {step === 4 && hasCompleteResult && (
          <section className="panel">
            <p className="eyebrow">Result</p>
            <h2>나의 공부 성향 요약</h2>
            <p>{result.summary}</p>
            <div className="answers">
              {[...getSelectedOptionLabels(STUDY_QUESTIONS, studyAnswers), ...getSelectedOptionLabels(STRESS_QUESTIONS, stressAnswers)].map((item) => (
                <span className="answer-chip" key={`${item.question}-${item.answer}`}>
                  {item.question}: {item.answer}
                </span>
              ))}
            </div>

            <div className="two-col">
              <div className="result-card">
                <h3>MBTI 입력 출처</h3>
                <p>
                  {mbtiKnown
                    ? `사용자가 입력한 공식 MBTI 결과: ${mbti}`
                    : "공식 MBTI 결과를 입력하지 않았습니다. 추천에는 공부·스트레스 응답만 사용했습니다."}
                </p>
              </div>
              <div className="result-card">
                <h3>공부습관 기반 4축 탐색 신호</h3>
                <p className="lead" style={{ marginBottom: 8 }}>{result.preferenceProfile.code}</p>
                <p>{result.preferenceProfile.interpretation}</p>
                <div className="signal-grid">
                  {result.preferenceProfile.axes.map((axis) => (
                    <div className="signal-item" key={axis.axis}>
                      <strong>{axis.analogy}</strong>
                      <span>{axis.label} · {axis.leaning}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {mbtiKnown && result.match?.temperament && (
              <div className="feedback-card">
                <p className="eyebrow">MBTI × 공부법 매칭</p>
                <h3>{mbti} · {result.match.temperamentLabel} 맞춤 매칭</h3>
                <p>{result.match.reason}</p>
                <div className="answers">
                  {result.recommendations.map((item) => (
                    <span className="answer-chip" key={`match-${item.id}`}>{item.title}</span>
                  ))}
                </div>
                <p className="hint" style={{ marginTop: 10 }}>
                  이 매칭은 문헌에서 도출한 출발점입니다(선호일 수 있음). 실제 효과는 실행 후 결과로 확인합니다 — 아래 baseline과 비교해 기록합니다.
                </p>
              </div>
            )}

            <div className="feedback-card">
              <p className="eyebrow">Baseline comparison</p>
              <h3>MBTI 신호의 추가 효과를 분리해 기록합니다</h3>
              <p>
                {mbtiKnown
                  ? result.baselineRecommendations.map((item) => item.id).join("|") ===
                    result.recommendations.map((item) => item.id).join("|")
                    ? "이번 응답에서는 MBTI 힌트를 포함해도 TOP 3 추천 순서가 바뀌지 않았습니다."
                    : "이번 응답에서는 MBTI 힌트를 포함했을 때 TOP 3 추천 순서가 달라졌습니다. 이것은 효과가 좋아졌다는 뜻이 아니며 후속 결과로 검증해야 합니다."
                  : "공식 MBTI 결과가 없어 행동·상태 기반 기준(baseline)을 최종 추천으로 사용했습니다. 공부습관 기반 탐색 코드는 추천 가중치에 넣지 않았습니다."}
              </p>
              {mbtiKnown && (
                <div className="signal-grid">
                  <div className="signal-item">
                    <strong>행동·상태 기반 기준</strong>
                    <span>{result.baselineRecommendations.map((item) => item.title).join(" → ")}</span>
                  </div>
                  <div className="signal-item">
                    <strong>MBTI 힌트 추가</strong>
                    <span>{result.recommendations.map((item) => item.title).join(" → ")}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="result-layout">
              <div className="result-card">
                <h3>핵심 행동지표</h3>
                <div className="score-list">
                  {topScores.map(([key, value]) => (
                    <ScoreBar key={key} label={SCORE_LABELS[key]} value={value} />
                  ))}
                </div>
                <p className="hint">점수는 사용자를 평가하거나 남과 비교하는 값이 아니라, 오늘 어떤 방식을 먼저 시도해볼지 추천 방향을 정하는 신호입니다.</p>
              </div>
              <div className="result-card">
                <h3>추천 공부법 TOP 3</h3>
                <div className="card-list">
                  {result.recommendations.map((item) => (
                    <article className="method" key={item.title}>
                      <strong>{item.title}</strong>
                      <p>{item.reason}</p>
                      <p>{item.action}</p>
                    </article>
                  ))}
                </div>
              </div>
            </div>

            <div className="two-col">
              <div className="result-card">
                <h3>피해야 할 공부 방식</h3>
                <ul>{result.avoidList.map((item) => <li key={item}>{item}</li>)}</ul>
              </div>
              <div className="result-card">
                <h3>스트레스 신호</h3>
                <ul>{result.stressSignals.map((item) => <li key={item}>{item}</li>)}</ul>
              </div>
            </div>

            <div className="feedback-card">
              <p className="eyebrow">Recommendation feedback · {ALGORITHM_VERSION}</p>
              <h3>이 추천이 현재 상황에 얼마나 맞나요?</h3>
              <p>이 평가는 사용자가 아니라 추천 시스템의 적합도를 확인합니다. MVP에서는 이 브라우저의 localStorage에만 저장되며 서버나 GitHub로 전송되지 않습니다.</p>
              <div className="rating-grid" aria-label="추천 적합도">
                {[1, 2, 3, 4, 5].map((score) => (
                  <OptionCard active={fitScore === score} key={score} onClick={() => setFitScore(score)}>
                    {score}
                  </OptionCard>
                ))}
              </div>
              <textarea
                aria-label="추천에 대한 선택 의견"
                maxLength={300}
                onChange={(event) => setFeedbackNote(event.target.value)}
                placeholder="선택 사항: 맞았던 점이나 조정이 필요한 점을 적어주세요. 개인정보는 입력하지 마세요."
                value={feedbackNote}
              />
              <div className="range-group">
                <label className="range-row">
                  이해도
                  <input max="5" min="1" onChange={(event) => setUnderstandingScore(Number(event.target.value))} type="range" value={understandingScore} />
                  <span>{understandingScore}</span>
                </label>
                <label className="range-row">
                  실행 가능성
                  <input max="5" min="1" onChange={(event) => setActionabilityScore(Number(event.target.value))} type="range" value={actionabilityScore} />
                  <span>{actionabilityScore}</span>
                </label>
              </div>
              <button className="secondary" disabled={!fitScore} onClick={handleFeedbackSave} style={{ marginTop: 12 }} type="button">
                추천 평가를 이 브라우저에 저장 또는 갱신
              </button>
              {feedbackCount > 0 && <div className="saved">추천 평가 {feedbackCount}개가 이 브라우저에 저장되어 있습니다.</div>}
            </div>

            <div className="feedback-card">
              <p className="eyebrow">Research data · 선택</p>
              <h3>익명 요약을 연구 데이터로 저장(선택)</h3>
              <p>
                동의하면 이름·자유응답 없이 <strong>익명 요약(매칭 방법·적합도·집중/피로·보정오차 등)</strong>만 서버에 저장해 이후 효과 분석에 사용합니다. 언제든 삭제할 수 있고, 동의하지 않아도 앱은 그대로 사용됩니다.
              </p>
              <label className="checkline">
                <input checked={serverConsent} onChange={(event) => setServerConsent(event.target.checked)} type="checkbox" />
                익명 요약을 서버에 저장하는 데 동의합니다.
              </label>
              <div className="actions">
                <button className="secondary" disabled={!serverConsent} onClick={handleServerSave} type="button">
                  서버에 익명 저장
                </button>
                <button className="secondary" onClick={handleServerList} type="button">
                  내 서버 기록 보기
                </button>
                <button className="secondary" onClick={handleServerDelete} type="button">
                  내 서버 기록 삭제
                </button>
              </div>
              {serverMsg && <div className="saved">{serverMsg}</div>}
              {serverCount !== null && <p className="hint" style={{ marginTop: 6 }}>현재 서버에 내 익명 기록 {serverCount}개.</p>}
            </div>

            <div className="actions">
              <button className="secondary" onClick={() => setStep(3)} type="button">
                이전
              </button>
              <button className="primary" onClick={() => setStep(5)} type="button">
                오늘의 실천 카드 보기
              </button>
            </div>
          </section>
        )}

        {step === 5 && hasCompleteResult && (
          <section className="panel">
            <p className="eyebrow">Routine</p>
            <h2>{result.routine.title}</h2>
            <p>{result.routine.estimatedMinutes}분 안에 끝나는 작은 루틴으로 먼저 시도해볼 수 있습니다.</p>

            <div className="result-card" style={{ marginTop: 16 }}>
              <h3>오늘의 시간블록 (총 {result.schedule.totalMinutes}분)</h3>
              <div className="answers">
                {result.schedule.blocks.map((block) => (
                  <span className="answer-chip" key={block.order}>
                    {block.order}. {block.title} · {block.minutes}분
                  </span>
                ))}
              </div>
              <p className="hint" style={{ marginTop: 10 }}>
                매칭된 학습법을 오늘 실행할 블록으로 배치했습니다. 상세 시간표는 이후 단계에서 확장합니다.
              </p>
            </div>

            <div className="routine">
              <div className="result-card">
                <h3>20~30분 공부 루틴</h3>
                <ul>{result.routine.studySteps.map((item) => <li key={item}>{item}</li>)}</ul>
              </div>
              <div className="result-card">
                <h3>회복 루틴</h3>
                <p>{result.routine.recoveryStep}</p>
                <label className="checkline">
                  <input checked={completed} onChange={(event) => setCompleted(event.target.checked)} type="checkbox" />
                  오늘 루틴 완료
                </label>
                <div className="range-group">
                  <label className="range-row">
                    집중도
                    <input max="5" min="1" onChange={(event) => setFocusLevel(Number(event.target.value))} type="range" value={focusLevel} />
                    <span>{focusLevel}</span>
                  </label>
                  <label className="range-row">
                    피로도
                    <input max="5" min="1" onChange={(event) => setFatigueLevel(Number(event.target.value))} type="range" value={fatigueLevel} />
                    <span>{fatigueLevel}</span>
                  </label>
                </div>
                <button className="primary" onClick={handleRecordSave} style={{ marginTop: 16 }} type="button">
                  기록 저장
                </button>
                {records.length > 0 && <div className="saved">최근 기록 {records.length}개가 저장되어 있습니다.</div>}
              </div>
            </div>
            <div className="feedback-card">
              <p className="eyebrow">Metacognition · self-check</p>
              <h3>루틴 뒤 1분, 예측하고 떠올려보기</h3>
              <p>
                이것은 점수·능력 판정이 아니라 이 한 세션의 자기 점검입니다. 먼저 예측한 뒤 자료 없이 실제로 떠올려, 내가 안다고 느끼는 정도와 실제 회상의 차이를 스스로 확인합니다.
              </p>
              {recallPhase === "predict" && (
                <>
                  <p className="hint" style={{ marginTop: 12 }}>
                    자료를 덮고: 오늘 핵심 {RECALL_TARGET}개 중 지금 몇 개를 떠올릴 수 있을 것 같나요?
                  </p>
                  <div className="rating-grid" aria-label="회상 예측 개수">
                    {Array.from({ length: RECALL_TARGET + 1 }, (_, count) => (
                      <OptionCard
                        active={recallPredicted === count}
                        key={count}
                        onClick={() => setRecallPredicted(count)}
                      >
                        {count}
                      </OptionCard>
                    ))}
                  </div>
                  <button
                    className="secondary"
                    disabled={recallPredicted === null}
                    onClick={() => setRecallPhase("recall")}
                    style={{ marginTop: 12 }}
                    type="button"
                  >
                    이제 자료 없이 떠올려보기
                  </button>
                </>
              )}
              {recallPhase === "recall" && (
                <>
                  <p className="hint" style={{ marginTop: 12 }}>
                    자료를 보지 말고 실제로 떠올려보세요. 실제로 몇 개를 떠올렸나요? (예측: {recallPredicted}개)
                  </p>
                  <div className="rating-grid" aria-label="실제 회상 개수">
                    {Array.from({ length: RECALL_TARGET + 1 }, (_, count) => (
                      <OptionCard
                        active={recallActual === count}
                        key={count}
                        onClick={() => setRecallActual(count)}
                      >
                        {count}
                      </OptionCard>
                    ))}
                  </div>
                  <button
                    className="secondary"
                    disabled={recallActual === null}
                    onClick={handleCalibrationSave}
                    style={{ marginTop: 12 }}
                    type="button"
                  >
                    자기 점검 기록
                  </button>
                </>
              )}
              {recallPhase === "done" && (
                <>
                  <div className="signal-grid" style={{ marginTop: 12 }}>
                    <div className="signal-item">
                      <strong>예측</strong>
                      <span>{recallPredicted}개</span>
                    </div>
                    <div className="signal-item">
                      <strong>실제 회상</strong>
                      <span>{recallActual}개</span>
                    </div>
                    <div className="signal-item">
                      <strong>보정 오차</strong>
                      <span>{Math.abs(recallPredicted - recallActual)}</span>
                    </div>
                  </div>
                  <p className="hint" style={{ marginTop: 12 }}>
                    {recallPredicted > recallActual
                      ? "예측이 실제보다 높았습니다. ‘안다는 느낌’이 실제 회상보다 앞설 수 있으니, 다음엔 조금 더 인출연습을 해볼 수 있습니다."
                      : recallPredicted < recallActual
                        ? "실제 회상이 예측보다 높았습니다. 스스로를 과소평가했을 수 있습니다."
                        : "예측과 실제가 같았습니다. 이번 세션에서는 자기 점검이 비교적 잘 맞았습니다."}
                  </p>
                  <button className="secondary" onClick={resetRecall} style={{ marginTop: 12 }} type="button">
                    다시 점검하기
                  </button>
                </>
              )}
              {calibrationCount > 0 && <div className="saved">자기 점검 기록 {calibrationCount}개가 이 브라우저에 저장되어 있습니다.</div>}
            </div>

            <div className="actions">
              <button className="secondary" onClick={() => setStep(4)} type="button">
                결과로 돌아가기
              </button>
              <button className="secondary" onClick={resetFlow} type="button">
                처음부터 다시하기
              </button>
            </div>
          </section>
        )}
        <p className="hint" style={{ marginTop: 18 }}>
          이 프로젝트는 공식 MBTI 평가를 제공·복제하지 않으며 The Myers-Briggs Company 또는 Myers &amp; Briggs Foundation과 제휴하지 않습니다. MBTI와 Myers-Briggs Type Indicator는 해당 권리자의 상표 또는 등록상표입니다.
        </p>
      </div>
    </main>
  );
}
