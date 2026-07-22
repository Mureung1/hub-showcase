import { useEffect, useState } from "react";
import { getAnalysis } from "../lib/api";
import { TEMPERAMENT_LABEL } from "../data/mbtiMethodMatching";

const METHOD_TITLES = {
  retrieval: "인출 연습",
  spacing: "분산 학습",
  selfExplanation: "자기설명",
  interleaving: "교차 학습",
  errorAnalysis: "오답 분석",
  environment: "환경 설계",
  shortBlock: "짧은 집중 블록",
};

function BarRow({ label, count, max }) {
  const width = max > 0 ? Math.round((count / max) * 100) : 0;
  return (
    <div className="score-row">
      <div>
        <strong>{label}</strong>
        <span>{count}회</span>
      </div>
      <div className="score-track">
        <span style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

export default function AnalysisReport({ onClose }) {
  const [state, setState] = useState({ status: "loading", data: null });

  useEffect(() => {
    let alive = true;
    getAnalysis()
      .then((data) => alive && setState({ status: "ready", data }))
      .catch(() => alive && setState({ status: "error", data: null }));
    return () => {
      alive = false;
    };
  }, []);

  const { status, data } = state;
  const methodEntries = data ? Object.entries(data.methodFrequency).sort((a, b) => b[1] - a[1]) : [];
  const maxMethod = methodEntries.length ? methodEntries[0][1] : 0;
  const tempEntries = data ? Object.entries(data.temperamentDistribution).sort((a, b) => b[1] - a[1]) : [];

  return (
    <section className="panel">
      <p className="eyebrow">Research data · 전체 경향(연구 집계)</p>
      <h2>전체 경향(연구 집계)</h2>
      <p>
        동의로 수집된 익명 요약을 <strong>참가자 전체 기준으로 집계</strong>한 결과입니다. 개인 기록은 표시하지 않습니다.
        내 결과·실행 이력을 개인 관점으로 보려면 결과 화면의 <strong>"내 회고 리포트"</strong>를 이용하세요.
      </p>

      {status === "loading" && <p className="hint" style={{ marginTop: 16 }}>불러오는 중…</p>}
      {status === "error" && (
        <p className="hint" style={{ marginTop: 16 }}>
          서버에 연결할 수 없습니다. 백엔드(`npm --prefix backend run dev`)가 실행 중인지 확인하세요.
        </p>
      )}

      {status === "ready" && data.total === 0 && (
        <p className="hint" style={{ marginTop: 16 }}>
          아직 수집된 데이터가 없습니다. 결과 화면에서 "익명 요약을 서버에 저장"에 동의하면 여기에 집계됩니다.
        </p>
      )}

      {status === "ready" && data.total > 0 && (
        <>
          <div className="two-col">
            <div className="result-card">
              <h3>요약</h3>
              <div className="signal-grid">
                <div className="signal-item">
                  <strong>수집 표본</strong>
                  <span>{data.total}건</span>
                </div>
                <div className="signal-item">
                  <strong>매칭 ≠ baseline 비율</strong>
                  <span>{Math.round(data.matchedDiffersFromBaselineRate * 100)}%</span>
                </div>
                <div className="signal-item">
                  <strong>평균 보정오차</strong>
                  <span>{data.avgCalibrationError === null ? "—" : data.avgCalibrationError.toFixed(2)} (n={data.calibrationN})</span>
                </div>
                <div className="signal-item">
                  <strong>평균 적합도</strong>
                  <span>{data.avgFitScore === null ? "—" : data.avgFitScore.toFixed(2)} / 5 (n={data.fitN})</span>
                </div>
              </div>
              <p className="hint" style={{ marginTop: 10 }}>
                이 값은 사용성·경향 지표입니다. 표본이 작을 때는 해석에 주의하고, 만족도(적합도)를 학습효과와 동일시하지 않습니다.
              </p>
            </div>

            <div className="result-card">
              <h3>기질 분포</h3>
              <div className="answers">
                {tempEntries.length === 0 && <span className="hint">공식 MBTI 입력 표본 없음</span>}
                {tempEntries.map(([t, c]) => (
                  <span className="answer-chip" key={t}>
                    {TEMPERAMENT_LABEL[t] ?? t} · {c}건
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="result-card" style={{ marginTop: 16 }}>
            <h3>추천된 학습법 빈도</h3>
            <div className="score-list">
              {methodEntries.map(([id, count]) => (
                <BarRow key={id} label={METHOD_TITLES[id] ?? id} count={count} max={maxMethod} />
              ))}
            </div>
          </div>
        </>
      )}

      <div className="actions">
        <button className="secondary" onClick={onClose} type="button">
          돌아가기
        </button>
      </div>
    </section>
  );
}
