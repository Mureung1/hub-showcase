import { useEffect, useMemo, useState } from "react";
import { MBTI_TYPES, SCORE_LABELS, STUDY_QUESTIONS, STRESS_QUESTIONS } from "./data/questions";
import { createRecommendations } from "./lib/recommendations";
import { calculateScores, getSelectedOptionLabels } from "./lib/scoring";
import { loadRecords, loadResult, saveRecord, saveResult } from "./lib/storage";

const STEPS = ["소개", "MBTI", "공부 설문", "스트레스 설문", "결과", "실천 카드"];

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

export default function ProjectIntro() {
  const [storedSnapshot] = useState(() => loadResult());
  const [storedRecords] = useState(() => loadRecords());
  const [step, setStep] = useState(0);
  const [mbti, setMbti] = useState(() =>
    storedSnapshot?.profile?.mbti === "UNKNOWN" ? "" : (storedSnapshot?.profile?.mbti ?? ""),
  );
  const [mbtiKnown, setMbtiKnown] = useState(() => storedSnapshot?.profile?.mbtiKnown ?? true);
  const [studyAnswers, setStudyAnswers] = useState(() => storedSnapshot?.studyAnswers ?? {});
  const [stressAnswers, setStressAnswers] = useState(() => storedSnapshot?.stressAnswers ?? {});
  const [completed, setCompleted] = useState(false);
  const [focusLevel, setFocusLevel] = useState(3);
  const [fatigueLevel, setFatigueLevel] = useState(3);
  const [records, setRecords] = useState(storedRecords);

  const result = useMemo(() => {
    const scores = calculateScores({ mbti, mbtiKnown, studyAnswers, stressAnswers });
    const recommendationResult = createRecommendations(scores);

    return {
      scores,
      ...recommendationResult,
    };
  }, [mbti, mbtiKnown, studyAnswers, stressAnswers]);

  useEffect(() => {
    if (Object.keys(studyAnswers).length === 4 && Object.keys(stressAnswers).length === 4) {
      saveResult({
        profile: {
          mbti: mbtiKnown ? mbti : "UNKNOWN",
          mbtiKnown,
          createdAt: new Date().toISOString(),
        },
        studyAnswers,
        stressAnswers,
        result,
      });
    }
  }, [mbti, mbtiKnown, result, stressAnswers, studyAnswers]);

  const canContinueStudy = Object.keys(studyAnswers).length === STUDY_QUESTIONS.length;
  const canContinueStress = Object.keys(stressAnswers).length === STRESS_QUESTIONS.length;
  const topScores = Object.entries(result.scores)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  function chooseUnknownMbti() {
    setMbti("");
    setMbtiKnown(false);
    setStep(2);
  }

  function handleRecordSave() {
    const next = saveRecord({ completed, focusLevel, fatigueLevel });
    setRecords(next);
  }

  return (
    <main className="study-app">
      <style>{`
        /* ── 디자인 토큰: docs/design.md §2~§4 ── */
        #root{width:100%;max-width:100%;margin:0;border:0;text-align:left;display:block;min-height:100svh;}
        :root{
          --bg:#eef2f6;--surface:#fff;--surface-muted:#f4f7fb;
          --tint-blue:#e7eefc;--on-tint-blue:#2c5fd0;
          --tint-green:#e3f4ec;--on-tint-green:#1f7a54;
          --tint-lav:#ecebfb;--on-tint-lav:#5b53c6;
          --primary:#3b7dee;--primary-strong:#2f66c9;--on-primary:#fff;
          --accent:#2fb37a;--accent-strong:#24936a;--on-accent:#fff;
          --text-strong:#1a2230;--text:#4a5568;--text-muted:#8a93a3;
          --border:#e2e8f1;--border-soft:#eef1f6;--focus:#3b7dee;
          --shadow-sm:0 1px 3px rgba(27,45,76,.06),0 1px 2px rgba(27,45,76,.04);
          --shadow-md:0 8px 24px rgba(27,45,76,.08);
          --font:-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo","Segoe UI",Roboto,"Malgun Gothic",system-ui,sans-serif;
          --r-sm:10px;--r-md:14px;--r-lg:20px;--r-pill:999px;
        }
        @media (prefers-color-scheme:dark){:root{
          --bg:#10151c;--surface:#182029;--surface-muted:#1e2732;
          --tint-blue:#1b2942;--on-tint-blue:#9dbcf6;
          --tint-green:#16311f;--on-tint-green:#74d3a4;
          --tint-lav:#24234a;--on-tint-lav:#b6b0f5;
          --primary:#5a97f2;--primary-strong:#78abf6;--on-primary:#0c1119;
          --accent:#43c491;--accent-strong:#63d3a6;--on-accent:#0c1119;
          --text-strong:#eef2f7;--text:#b3bccb;--text-muted:#7d8798;
          --border:#2a343f;--border-soft:#222b35;--focus:#5a97f2;
          --shadow-sm:0 1px 3px rgba(0,0,0,.4);--shadow-md:0 10px 28px rgba(0,0,0,.45);
        }}
        /* ── 레이아웃 ── */
        .study-app{min-height:100svh;background:var(--bg);color:var(--text);font-family:var(--font);-webkit-font-smoothing:antialiased;}
        .shell{width:min(720px,calc(100% - 32px));margin:0 auto;padding:24px 0 48px;}
        .topbar{display:flex;justify-content:space-between;gap:12px;align-items:center;margin-bottom:20px;}
        .brand{font-weight:800;font-size:15px;color:var(--text-strong);}
        .pill{border:1px solid var(--border);background:var(--surface);color:var(--text-muted);border-radius:var(--r-pill);padding:7px 12px;font-size:12px;font-weight:600;}
        /* ── 진행 표시 ── */
        .progress{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:18px;}
        .progress-dot{border:1px solid var(--border);background:var(--surface);color:var(--text-muted);border-radius:var(--r-pill);padding:7px 11px;font-size:12px;font-weight:700;}
        .progress-dot.active{background:var(--primary);color:var(--on-primary);border-color:var(--primary);}
        /* ── 카드/패널 ── */
        .panel{background:var(--surface);border:1px solid var(--border);border-radius:var(--r-lg);box-shadow:var(--shadow-sm);padding:24px;}
        .hero{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(280px,.95fr);gap:24px;align-items:center;}
        /* ── 타이포 ── */
        .eyebrow{margin:0 0 10px;color:var(--text-muted);font-size:13px;font-weight:700;letter-spacing:.04em;}
        h1,h2,h3{letter-spacing:-.01em;color:var(--text-strong);}
        h1{font-size:clamp(30px,6vw,52px);line-height:1.08;margin:0 0 16px;font-weight:800;}
        h2{font-size:clamp(22px,3vw,32px);line-height:1.15;margin:0 0 12px;font-weight:800;}
        h3{font-size:18px;line-height:1.3;margin:0 0 12px;font-weight:700;}
        p{margin:0;line-height:1.6;color:var(--text);}
        .lead{font-size:18px;max-width:640px;margin:0 0 16px;}
        .notice{background:var(--tint-green);padding:14px 16px;border-radius:var(--r-md);color:var(--on-tint-green);margin-top:16px;font-size:14px;line-height:1.55;}
        .hint{margin-top:12px;font-size:13px;color:var(--text-muted);line-height:1.5;}
        /* ── 히어로 강조 카드(학습=블루) ── */
        .hero-card{background:var(--tint-blue);color:var(--on-tint-blue);border-radius:var(--r-lg);padding:20px;display:grid;gap:14px;}
        .hero-card p{color:var(--on-tint-blue);}
        .hero-card .eyebrow{color:var(--on-tint-blue);opacity:.85;}
        .mini-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;}
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
        /* ── 칩 ── */
        .answers{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px;}
        .answer-chip{background:var(--tint-blue);color:var(--on-tint-blue);border-radius:var(--r-pill);padding:6px 11px;font-size:12px;font-weight:600;}
        @media (max-width:860px){.hero,.result-layout,.routine,.two-col{grid-template-columns:1fr}.panel{padding:18px}.topbar{align-items:flex-start;flex-direction:column}.mini-grid{grid-template-columns:1fr 1fr} }
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
              <h1>나에게 맞는 공부·회복 루틴을 오늘 바로 찾기</h1>
              <p className="lead">
                MBTI와 공부·스트레스 설문을 함께 보고, 성향을 단정하지 않은 채 학습 선호와 피로 패턴을 행동지표로 정리합니다.
              </p>
              <div className="notice">
                MBTI는 사람을 고정적으로 판단하는 도구가 아니라 학습 선호를 탐색하는 출발점입니다. 스트레스 기능은 피로 신호와 회복 루틴을 다루는 생활관리 기능입니다.
              </div>
              <div className="actions">
                <button className="primary" onClick={() => setStep(1)} type="button">
                  시작하기
                </button>
              </div>
            </div>
            <div className="hero-card">
              <p className="eyebrow">핵심 기능 3개</p>
              <div className="mini-grid">
                <div className="mini">성향·상태 점검</div>
                <div className="mini">학습법 매칭</div>
                <div className="mini">오늘의 루틴</div>
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
            <h2>MBTI를 선택하세요</h2>
            <p>모르는 경우에도 진행할 수 있습니다. 이후 설문 응답이 추천의 중심이 됩니다.</p>
            <div className="grid" style={{ marginTop: 20 }}>
              {MBTI_TYPES.map((type) => (
                <OptionCard
                  active={mbtiKnown && mbti === type}
                  key={type}
                  onClick={() => {
                    setMbti(type);
                    setMbtiKnown(true);
                  }}
                >
                  {type}
                </OptionCard>
              ))}
            </div>
            <div className="actions">
              <button className="secondary" onClick={chooseUnknownMbti} type="button">
                MBTI를 몰라요
              </button>
              <button className="primary" disabled={!mbtiKnown || !mbti} onClick={() => setStep(2)} type="button">
                공부 설문으로 이동
              </button>
            </div>
          </section>
        )}

        {step === 2 && (
          <section className="panel">
            <p className="eyebrow">Step 2</p>
            <h2>공부 성향 설문</h2>
            <p>집중 방식, 이해 방식, 복습 방식, 계획 방식을 선택하세요.</p>
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

        {step === 4 && (
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

        {step === 5 && (
          <section className="panel">
            <p className="eyebrow">Routine</p>
            <h2>{result.routine.title}</h2>
            <p>{result.routine.estimatedMinutes}분 안에 끝나는 작은 루틴으로 먼저 시도해볼 수 있습니다.</p>
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
            <div className="actions">
              <button className="secondary" onClick={() => setStep(4)} type="button">
                결과로 돌아가기
              </button>
              <button className="secondary" onClick={() => setStep(0)} type="button">
                처음으로
              </button>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
