// 개인 회고 리포트(항목 3, 핵심 A). 서버·동의 없이 로컬 데이터로만 구성한다 — 오프라인·프라이버시 보존.
// 재료: 이번 세션 result(props) + localStorage 이력(records·feedback·calibration).
// 연구 집계(AnalysisReport, /api/analysis)와 분리된 "사용자 관점" 표면이다.
import { useMemo, useState } from "react";
import { SCORE_LABELS } from "../data/questions";
import { loadRecords, loadFeedback, loadCalibration } from "../lib/storage";

function formatDate(iso) {
  if (!iso) {
    return "";
  }
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

function average(values) {
  const nums = values.filter((v) => typeof v === "number");
  if (nums.length === 0) {
    return null;
  }
  return nums.reduce((sum, v) => sum + v, 0) / nums.length;
}

// 결과·이력을 포트폴리오/회고에 붙일 수 있는 정리된 텍스트로 만든다(클립보드 복사용).
function buildRetroText({ topIndicators, recommendations, records, feedbackAvg, calibrationAvg, nextAction, mbtiLine }) {
  const lines = [
    "[공부 성향 회고 리포트]",
    mbtiLine,
    `두드러진 행동지표: ${topIndicators.map((i) => `${i.label}(${i.value})`).join(", ")}`,
    `오늘 시도할 공부법: ${recommendations.map((r) => r.title).join(" → ")}`,
  ];
  if (records.length > 0) {
    const done = records.filter((r) => r.completed).length;
    lines.push(`실행 기록: 최근 ${records.length}회 중 ${done}회 완료`);
  }
  if (feedbackAvg?.fit != null) {
    lines.push(`추천 수용: 적합도 ${feedbackAvg.fit.toFixed(1)}/5 · 이해도 ${feedbackAvg.understanding.toFixed(1)}/5 · 실행가능성 ${feedbackAvg.actionability.toFixed(1)}/5`);
  }
  if (calibrationAvg != null) {
    lines.push(`예측-실제 평균 보정오차: ${calibrationAvg.toFixed(1)} (0에 가까울수록 자기 예측이 정확)`);
  }
  lines.push(`다음에 할 것: ${nextAction}`);
  lines.push("※ 규칙 기반 프로토타입의 추천 신호이며, 검증된 심리검사·진단이 아닙니다.");
  return lines.join("\n");
}

export default function RetrospectiveReport({ onClose, result, mbti, mbtiKnown, mbtiEstimated, estimatedMeta }) {
  const [copied, setCopied] = useState(false);

  const records = useMemo(() => loadRecords(), []);
  const feedback = useMemo(() => loadFeedback(), []);
  const calibration = useMemo(() => loadCalibration(), []);

  const topIndicators = Object.entries(result.scores)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([key, value]) => ({ key, label: SCORE_LABELS[key] ?? key, value }));

  const recommendations = result.recommendations;

  const feedbackAvg = feedback.length
    ? {
        fit: average(feedback.map((f) => f.fitScore)),
        understanding: average(feedback.map((f) => f.understandingScore)),
        actionability: average(feedback.map((f) => f.actionabilityScore)),
      }
    : null;

  const calibrationAvg = calibration.length
    ? average(
        calibration.map((c) =>
          typeof c.calibrationError === "number" ? c.calibrationError : Math.abs((c.predicted ?? 0) - (c.actual ?? 0)),
        ),
      )
    : null;

  const nextAction = recommendations[0]?.action ?? "오늘은 20분짜리 작은 블록 하나만 완료해 봅니다.";

  const mbtiLine = mbtiKnown
    ? `MBTI(공식 자기입력): ${mbti}`
    : mbtiEstimated
      ? `MBTI(AI 간이 추정·공식 아님): ${mbti}`
      : "MBTI: 입력하지 않음(공부·스트레스 응답만 사용)";

  async function handleCopy() {
    const text = buildRetroText({ topIndicators, recommendations, records, feedbackAvg, calibrationAvg, nextAction, mbtiLine });
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section className="panel">
      <p className="eyebrow">My retrospective · 로컬 저장 · 회고용</p>
      <h2>내 회고 리포트</h2>
      <p>
        이 리포트는 이번 세션 결과와 이 브라우저에 저장된 내 실행·자기 점검 기록을 한곳에 모은 것입니다.
        서버로 전송하지 않으며, 아래 요약을 복사해 회고나 포트폴리오에 그대로 붙일 수 있습니다.
      </p>

      <div className="result-card" style={{ marginTop: 16 }}>
        <h3>오늘의 나 요약</h3>
        <p className="hint" style={{ marginBottom: 8 }}>{mbtiLine}</p>
        <div className="signal-grid">
          {topIndicators.map((item) => (
            <div className="signal-item" key={item.key}>
              <strong>{item.label}</strong>
              <span>{item.value}</span>
            </div>
          ))}
        </div>
        <p className="hint" style={{ marginTop: 10 }}>
          점수는 우열이 아니라 "오늘 어떤 방식을 먼저 시도할지" 방향을 정하는 신호입니다. 두드러진 지표일수록 아래 추천에 많이 반영됐습니다.
        </p>
        <div className="answers" style={{ marginTop: 10 }}>
          {recommendations.map((item) => (
            <span className="answer-chip" key={item.id}>{item.title}</span>
          ))}
        </div>
      </div>

      {(mbtiEstimated && (estimatedMeta?.observedSignals?.length > 0 || estimatedMeta?.rationale)) && (
        <div className="result-card" style={{ marginTop: 16 }}>
          <h3>AI 대화에서 관찰된 근거</h3>
          <p className="hint" style={{ marginBottom: 8 }}>
            아래는 짧은 대화에서 관찰된 <strong>탐색적 근거</strong>이며 공식 판정이 아닙니다. 판정을 대체하지 않고, 왜 이 유형을 시작점으로 삼았는지 보완 설명입니다.
          </p>
          {estimatedMeta?.rationale && <p>{estimatedMeta.rationale}</p>}
          {estimatedMeta?.observedSignals?.length > 0 && (
            <div className="answers" style={{ marginTop: 8 }}>
              {estimatedMeta.observedSignals.map((sig, idx) => (
                <span className="answer-chip" key={`${sig.signal ?? idx}`}>
                  {sig.signal}{sig.indicator ? ` · ${SCORE_LABELS[sig.indicator] ?? sig.indicator}` : ""}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="two-col">
        <div className="result-card">
          <h3>실제 실행 기록</h3>
          {records.length === 0 ? (
            <p className="hint">아직 실행 기록이 없습니다. 루틴 화면에서 "기록 저장"을 하면 여기에 쌓입니다.</p>
          ) : (
            <div className="score-list">
              {records.map((r, idx) => (
                <div className="signal-item" key={r.date ?? idx}>
                  <strong>{formatDate(r.date)} · {r.completed ? "완료" : "미완료"}</strong>
                  <span>집중 {r.focusLevel}/5 · 피로 {r.fatigueLevel}/5</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="result-card">
          <h3>예측 vs 실제 대조</h3>
          {calibrationAvg == null ? (
            <p className="hint">아직 자기 점검 기록이 없습니다. 루틴 뒤 "예측하고 떠올려보기"를 하면 여기에 반영됩니다.</p>
          ) : (
            <>
              <p className="lead" style={{ marginBottom: 4 }}>평균 보정오차 {calibrationAvg.toFixed(1)}</p>
              <p className="hint">
                예측한 회상 개수와 실제 회상 개수의 평균 차이입니다. 0에 가까울수록 "안다는 느낌"과 실제 기억이 잘 맞는다는 뜻이며,
                이 값이 MBTI 유형보다 더 믿을 만한 자기조절 신호입니다.
              </p>
            </>
          )}
        </div>
      </div>

      {feedbackAvg?.fit != null && (
        <div className="result-card" style={{ marginTop: 16 }}>
          <h3>추천 수용 요약</h3>
          <div className="signal-grid">
            <div className="signal-item">
              <strong>적합도</strong>
              <span>{feedbackAvg.fit.toFixed(1)} / 5</span>
            </div>
            <div className="signal-item">
              <strong>이해도</strong>
              <span>{feedbackAvg.understanding.toFixed(1)} / 5</span>
            </div>
            <div className="signal-item">
              <strong>실행 가능성</strong>
              <span>{feedbackAvg.actionability.toFixed(1)} / 5</span>
            </div>
          </div>
          <p className="hint" style={{ marginTop: 10 }}>
            이 값은 추천 시스템의 적합도이지 당신에 대한 평가가 아닙니다. 만족도가 곧 학습효과를 뜻하지도 않습니다.
          </p>
        </div>
      )}

      <div className="feedback-card" style={{ marginTop: 16 }}>
        <p className="eyebrow">다음에 할 것</p>
        <h3>딱 한 가지만 이어서</h3>
        <p>{nextAction}</p>
        <p className="hint" style={{ marginTop: 8 }}>
          해본 뒤 루틴 화면에서 완료·집중·피로를 기록하고 자기 점검을 남기면, 다음 회고 리포트에서 변화를 확인할 수 있습니다.
        </p>
      </div>

      <div className="actions">
        <button className="primary" onClick={handleCopy} type="button">
          {copied ? "복사됨 ✓" : "회고 요약 복사하기"}
        </button>
        <button className="secondary" onClick={onClose} type="button">
          돌아가기
        </button>
      </div>
    </section>
  );
}
