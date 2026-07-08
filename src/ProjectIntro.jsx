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
        #root{width:100%;border:0;text-align:left;display:block;background:#f6f3ee;}
        .study-app{min-height:100vh;background:#f6f3ee;color:#20242a;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;}
        .shell{width:min(1120px,calc(100% - 32px));margin:0 auto;padding:28px 0 44px;}
        .topbar{display:flex;justify-content:space-between;gap:16px;align-items:center;margin-bottom:22px;}
        .brand{font-weight:800;font-size:15px;letter-spacing:.02em;color:#224037;}
        .pill{border:1px solid #d6d0c5;background:#fffdf8;color:#53615b;border-radius:999px;padding:8px 12px;font-size:13px;}
        .progress{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:18px;}
        .progress-dot{border:1px solid #d9d2c8;background:#fffaf2;color:#776f63;border-radius:999px;padding:7px 10px;font-size:12px;font-weight:700;}
        .progress-dot.active{background:#214f45;color:#fff;border-color:#214f45;}
        .panel{background:#fffdf8;border:1px solid #ded7cc;border-radius:8px;box-shadow:0 18px 50px rgba(38,32,24,.08);padding:28px;}
        .hero{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(320px,.95fr);gap:28px;align-items:center;}
        .eyebrow{margin:0 0 10px;color:#c05f3c;font-size:13px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;}
        h1,h2,h3,p{letter-spacing:0;}
        h1{font-size:clamp(34px,6vw,64px);line-height:1.05;margin:0 0 18px;color:#1e2725;font-weight:900;}
        h2{font-size:clamp(25px,3vw,38px);line-height:1.15;margin:0 0 12px;color:#1e2725;font-weight:850;}
        h3{font-size:18px;margin:0 0 14px;color:#222723;font-weight:800;}
        p{line-height:1.65;color:#53615b;}
        .lead{font-size:18px;max-width:720px;margin:0 0 18px;}
        .notice{background:#eef4f1;border-left:4px solid #2d6b5f;padding:14px 16px;border-radius:6px;color:#2d4b43;margin-top:18px;}
        .hero-card{background:#1f2d2b;color:#fff;border-radius:8px;padding:22px;display:grid;gap:14px;}
        .hero-card p{color:#d8e4df;}
        .mini-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;}
        .mini{background:#fffaf2;color:#26312d;border-radius:8px;padding:12px;font-weight:800;text-align:center;}
        .actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:22px;}
        button{font:inherit;}
        .primary,.secondary{border:0;border-radius:8px;padding:12px 16px;font-weight:800;cursor:pointer;min-height:46px;}
        .primary{background:#214f45;color:white;}
        .primary:disabled{opacity:.45;cursor:not-allowed;}
        .secondary{background:#eadfce;color:#2f3833;}
        .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;}
        .option-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:10px;}
        .option-card{border:1px solid #d8d1c5;background:#fffaf2;border-radius:8px;padding:13px;text-align:left;color:#2f3833;cursor:pointer;font-weight:750;min-height:54px;}
        .option-card:hover,.option-card.selected{border-color:#214f45;background:#e9f1ed;color:#163c34;}
        .question-list{display:grid;gap:14px;margin-top:20px;}
        .question-card,.result-card{border:1px solid #ddd5c8;background:#fffaf2;border-radius:8px;padding:18px;}
        .result-layout{display:grid;grid-template-columns:minmax(0,.88fr) minmax(360px,1.12fr);gap:16px;margin-top:18px;}
        .score-list{display:grid;gap:11px;}
        .score-row>div:first-child{display:flex;justify-content:space-between;gap:10px;font-size:13px;margin-bottom:6px;color:#38443f;}
        .score-track{height:9px;border-radius:999px;background:#eadfce;overflow:hidden;}
        .score-track span{display:block;height:100%;background:#2d6b5f;border-radius:999px;}
        .card-list{display:grid;gap:12px;}
        .method{border:1px solid #ded7cc;border-radius:8px;padding:16px;background:#fffdf8;}
        .method strong{display:block;color:#1f2d2b;font-size:18px;margin-bottom:8px;}
        .method p{margin:6px 0 0;}
        .two-col{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:16px;}
        ul{margin:10px 0 0;padding-left:18px;color:#53615b;line-height:1.7;}
        .routine{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:18px;}
        .checkline{display:flex;align-items:center;gap:10px;margin-top:16px;font-weight:800;}
        .checkline input{width:20px;height:20px;}
        .range-group{display:grid;gap:12px;margin-top:16px;}
        .range-row{display:grid;grid-template-columns:96px 1fr 42px;gap:10px;align-items:center;color:#37443e;font-weight:750;}
        input[type="range"]{accent-color:#c05f3c;}
        .saved{margin-top:14px;color:#2d6b5f;font-weight:800;}
        .answers{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px;}
        .answer-chip{background:#eef4f1;color:#2d4b43;border-radius:999px;padding:6px 10px;font-size:12px;font-weight:750;}
        @media (max-width:860px){.hero,.result-layout,.routine,.two-col{grid-template-columns:1fr}.panel{padding:20px}.topbar{align-items:flex-start;flex-direction:column}.mini-grid{grid-template-columns:1fr} }
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
