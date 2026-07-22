import { useEffect, useState } from "react";

import Header from "../components/layout/Header";
import { getSession, getUser } from "../features/auth/authStorage";
import {
  getCareerAnalysis,
  getCareerSpec,
  getMissingSpecFields,
  isCareerSpecComplete,
  saveCareerAnalysis,
} from "../features/career/careerStorage";
import { getMyAnalysis, runMyAnalysis } from "../features/career/analysisApi";
import { getMySpec } from "../features/career/specApi";
import { navigate, routes } from "../router";

function Analysis() {
  const session = getSession();
  const sessionId = session?.id;
  const user = getUser();
  const [spec, setSpec] = useState(getCareerSpec(session?.id));
  const [analysis, setAnalysis] = useState(getCareerAnalysis(session?.id));
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(Boolean(session));
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const missingFields = getMissingSpecFields(spec);
  const isComplete = isCareerSpecComplete(spec);

  useEffect(() => {
    if (!sessionId) {
      return;
    }

    let isMounted = true;

    const loadAnalysisData = async () => {
      try {
        const [savedSpec, savedAnalysis] = await Promise.all([
          getMySpec(),
          getMyAnalysis(),
        ]);

        if (!isMounted) {
          return;
        }

        if (savedSpec) {
          setSpec(savedSpec);
        }

        if (savedAnalysis) {
          setAnalysis(savedAnalysis);
          saveCareerAnalysis(sessionId, savedAnalysis);
        }
      } catch (error) {
        if (isMounted) {
          setMessage(error.message);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadAnalysisData();

    return () => {
      isMounted = false;
    };
  }, [sessionId]);

  const handleAnalyze = async () => {
    if (!session || !user) {
      alert("분석하려면 로그인해 주세요.");
      navigate(routes.login);
      return;
    }

    if (!isComplete) {
      alert("스펙 핵심 항목을 모두 등록한 뒤 분석할 수 있습니다.");
      navigate(routes.specs);
      return;
    }

    setIsAnalyzing(true);
    setMessage("");

    try {
      const nextAnalysis = await runMyAnalysis();
      setAnalysis(saveCareerAnalysis(session.id, nextAnalysis));
    } catch (error) {
      setMessage(error.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (!session) {
    return (
      <main style={styles.container}>
        <Header />
        <section style={styles.content}>
          <p style={styles.badge}>Career Mission</p>
          <h1 style={styles.title}>AI 분석</h1>
          <p style={styles.description}>
            로그인 후 스펙 핵심 항목을 등록하면 준비도 분석을 실행할 수 있습니다.
          </p>
          <button
            type="button"
            className="cm-button cm-button-primary cm-button-start"
            onClick={() => navigate(routes.login)}
          >
            로그인으로 이동
          </button>
        </section>
      </main>
    );
  }

  return (
    <main style={styles.container}>
      <Header />
      <section style={styles.content}>
        <p style={styles.badge}>Career Mission</p>
        <h1 style={styles.title}>AI 분석</h1>
        <p style={styles.description}>
          목표 직무와 등록한 스펙을 기준으로 준비도, 강점, 보완 우선순위를
          확정합니다.
        </p>

        {isLoading && <p style={styles.info}>저장된 스펙과 분석 결과를 불러오는 중입니다.</p>}
        {message && <p style={styles.error}>{message}</p>}

        {!isLoading && !isComplete && (
          <div style={styles.notice}>
            <strong>분석 전 등록이 필요한 항목</strong>
            <div style={styles.chipList}>
              {missingFields.map((field) => (
                <span key={field.name} style={styles.chip}>
                  {field.label}
                </span>
              ))}
            </div>
            <button
              type="button"
              className="cm-button cm-button-primary cm-button-start"
              onClick={() => navigate(routes.specs)}
            >
              스펙 등록하러 가기
            </button>
          </div>
        )}

        {!isLoading && isComplete && !analysis && (
          <div style={styles.notice}>
            <strong>등록한 스펙을 분석할 준비가 끝났습니다.</strong>
            <span style={styles.noticeText}>
              분석하기를 누르면 현재 등록값 기준으로 준비도 퍼센트가 확정됩니다.
              이후 스펙을 추가 저장하면 다시 분석할 수 있습니다.
            </span>
            <button
              type="button"
              className="cm-button cm-button-primary cm-button-start"
              onClick={handleAnalyze}
              disabled={isAnalyzing}
            >
              {isAnalyzing ? "분석 중" : "분석하기"}
            </button>
          </div>
        )}

        {!isLoading && analysis && (
          <div className="analysis-result-grid" style={styles.resultGrid}>
            <section style={styles.scoreCard}>
              <span style={styles.scoreLabel}>확정 준비도</span>
              <strong style={styles.score}>{analysis.readiness}%</strong>
              <div style={styles.scoreTrack}>
                <span
                  style={{
                    ...styles.scoreFill,
                    width: `${analysis.readiness}%`,
                  }}
                />
              </div>
              <button
                type="button"
                className="cm-button cm-button-dark cm-button-start"
                onClick={handleAnalyze}
                disabled={isAnalyzing}
              >
                {isAnalyzing ? "분석 중" : "다시 분석하기"}
              </button>
              <button
                type="button"
                className="cm-button cm-button-dark cm-button-start"
                onClick={() => navigate(routes.mission)}
              >
                추천 미션 보기
              </button>
            </section>

            <div style={styles.resultColumn}>
              <section style={styles.card}>
                <strong style={styles.cardTitle}>요약</strong>
                <div style={styles.metricList}>
                  <div style={styles.metricItem}>
                    <span>목표 직무</span>
                    <strong>{analysis.targetRole}</strong>
                  </div>
                  <div style={styles.metricItem}>
                    <span>직무 적합도</span>
                    <strong>{analysis.fitLevel}</strong>
                  </div>
                  <div style={styles.metricItem}>
                    <span>포트폴리오 준비도</span>
                    <strong>{analysis.portfolioLevel}</strong>
                  </div>
                  <div style={styles.metricItem}>
                    <span>번아웃 위험도</span>
                    <strong>{analysis.burnoutLevel}</strong>
                  </div>
                </div>
              </section>

              <div className="analysis-insight-grid" style={styles.insightGrid}>
                <section style={{ ...styles.card, ...styles.compactCard }}>
                  <strong style={styles.cardTitle}>강점</strong>
                  {analysis.strengths.map((item) => (
                    <p key={item} style={styles.listText}>
                      {item}
                    </p>
                  ))}
                </section>

                <section style={{ ...styles.card, ...styles.compactCard }}>
                  <strong style={styles.cardTitle}>보완 우선순위</strong>
                  {analysis.gaps.map((item) => (
                    <p key={item} style={styles.listText}>
                      {item}
                    </p>
                  ))}
                </section>
              </div>

              <section style={{ ...styles.card, ...styles.recommendationCard }}>
                <strong style={styles.cardTitle}>추천 준비 방향</strong>
                <div style={styles.recommendationList}>
                  {(analysis.recommendations || []).map((item, index) => (
                    <div key={item} style={styles.recommendationItem}>
                      <span style={styles.recommendationNumber}>{index + 1}</span>
                      <p style={styles.recommendationText}>{item}</p>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at 12% 8%, rgba(37, 99, 235, 0.16), transparent 28%), linear-gradient(135deg, #f8fafc 0%, #eef6ff 48%, #f8fbff 100%)",
    fontFamily: "Arial, sans-serif",
    color: "#0f172a",
  },
  content: {
    width: "min(1040px, calc(100% - clamp(32px, 6vw, 96px)))",
    margin: "0 auto",
    padding: "clamp(42px, 7vw, 86px) 0 96px",
  },
  badge: {
    display: "inline-block",
    margin: "0 0 18px",
    padding: "8px 13px",
    borderRadius: "999px",
    backgroundColor: "rgba(37, 99, 235, 0.1)",
    color: "#2563eb",
    fontSize: "13px",
    fontWeight: "bold",
  },
  title: {
    margin: "0 0 16px",
    fontSize: "clamp(32px, 5vw, 48px)",
    lineHeight: 1.15,
  },
  description: {
    maxWidth: "720px",
    margin: "0 0 28px",
    color: "#475569",
    fontSize: "17px",
    lineHeight: 1.7,
  },
  notice: {
    display: "grid",
    gap: "16px",
    maxWidth: "720px",
    padding: "22px",
    borderRadius: "18px",
    background: "rgba(255, 255, 255, 0.78)",
    border: "1px solid rgba(226, 232, 240, 0.9)",
    boxShadow: "0 18px 38px rgba(15, 23, 42, 0.08)",
  },
  noticeText: {
    color: "#475569",
    lineHeight: 1.6,
  },
  info: {
    maxWidth: "720px",
    margin: "0 0 18px",
    padding: "12px 14px",
    borderRadius: "12px",
    background: "#eff6ff",
    color: "#1d4ed8",
    fontSize: "14px",
    fontWeight: 700,
  },
  error: {
    maxWidth: "720px",
    margin: "0 0 18px",
    padding: "12px 14px",
    borderRadius: "12px",
    background: "#fee2e2",
    color: "#b91c1c",
    fontSize: "14px",
    fontWeight: 700,
  },
  chipList: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
  },
  chip: {
    padding: "7px 11px",
    borderRadius: "999px",
    background: "#eff6ff",
    color: "#1d4ed8",
    fontSize: "13px",
    fontWeight: 800,
  },
  resultGrid: {
    display: "grid",
    gridTemplateColumns: "minmax(240px, 320px) 1fr",
    gap: "16px",
    alignItems: "start",
  },
  resultColumn: {
    minWidth: 0,
    display: "grid",
    gap: "14px",
  },
  insightGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "12px",
  },
  scoreCard: {
    display: "grid",
    alignContent: "start",
    gap: "14px",
    padding: "24px",
    borderRadius: "20px",
    background: "linear-gradient(155deg, #0f172a, #1e293b)",
    color: "#e2e8f0",
    boxShadow: "0 24px 54px rgba(15, 23, 42, 0.22)",
  },
  scoreLabel: {
    color: "#cbd5e1",
    fontSize: "14px",
    fontWeight: 800,
  },
  score: {
    color: "#ffffff",
    fontSize: "56px",
    lineHeight: 1,
  },
  scoreTrack: {
    height: "9px",
    borderRadius: "999px",
    background: "rgba(255, 255, 255, 0.12)",
    overflow: "hidden",
  },
  scoreFill: {
    display: "block",
    height: "100%",
    borderRadius: "999px",
    background: "linear-gradient(90deg, #60a5fa, #22d3ee)",
  },
  card: {
    minWidth: 0,
    padding: "20px",
    borderRadius: "18px",
    background: "rgba(255, 255, 255, 0.78)",
    border: "1px solid rgba(226, 232, 240, 0.9)",
    boxShadow: "0 18px 38px rgba(15, 23, 42, 0.08)",
  },
  compactCard: {
    padding: "18px",
  },
  recommendationCard: {
    padding: "18px 20px",
  },
  cardTitle: {
    display: "block",
    marginBottom: "12px",
    fontSize: "16px",
  },
  metricList: {
    display: "grid",
    gap: "10px",
  },
  metricItem: {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    color: "#475569",
  },
  listText: {
    margin: "0 0 10px",
    color: "#475569",
    fontSize: "15px",
    lineHeight: 1.65,
  },
  recommendationList: {
    display: "grid",
    gap: "10px",
  },
  recommendationItem: {
    display: "grid",
    gridTemplateColumns: "28px minmax(0, 1fr)",
    gap: "10px",
    alignItems: "start",
    padding: "10px 12px",
    borderRadius: "12px",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
  },
  recommendationNumber: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "28px",
    height: "28px",
    borderRadius: "999px",
    background: "#eff6ff",
    color: "#1d4ed8",
    fontSize: "13px",
    fontWeight: 900,
  },
  recommendationText: {
    margin: 0,
    color: "#334155",
    fontSize: "15px",
    lineHeight: 1.65,
  },
};

export default Analysis;
