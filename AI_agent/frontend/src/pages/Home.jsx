import { useEffect, useState } from "react";
import Header from "../components/layout/Header";
import { homeFeatures } from "../data/homeFeatures";
import { getSession, getUser } from "../features/auth/authStorage";
import {
  getCareerAnalysis,
  getCareerSpec,
  isCareerSpecComplete,
} from "../features/career/careerStorage";
import { navigate, routes } from "../router";

const workflowSteps = [
  {
    title: "스펙 등록",
    text: "현재 상태 입력",
  },
  {
    title: "AI 분석",
    text: "부족 역량 확인",
  },
  {
    title: "미션 수행",
    text: "포트폴리오 결과물 생성",
  },
];

const getRandomReadiness = () => Math.floor(Math.random() * 41) + 40;

function Home() {
  const [activeFeatureIndex, setActiveFeatureIndex] = useState(0);
  const [sampleReadiness, setSampleReadiness] = useState(78);
  const [displayReadiness, setDisplayReadiness] = useState(78);
  const session = getSession();
  const user = getUser();
  const currentUser = session && user?.id === session.id ? user : null;
  const spec = getCareerSpec(currentUser?.id);
  const analysis = getCareerAnalysis(currentUser?.id);
  const hasCompleteSpec = isCareerSpecComplete(spec);
  const targetReadiness = analysis?.readiness || sampleReadiness;
  const readinessLabel = analysis
    ? "확정 준비도"
    : hasCompleteSpec
      ? "분석 대기 준비도"
      : "예시 준비도";
  const primaryActionLabel = analysis
    ? "분석 결과 보기"
    : hasCompleteSpec
      ? "분석하기"
      : "스펙 등록하고 분석 받기";
  const primaryActionPath = hasCompleteSpec || analysis ? routes.analysis : routes.specs;
  const panelMetrics = analysis
    ? [
        ["직무 적합도", analysis.fitLevel],
        ["포트폴리오 준비도", analysis.portfolioLevel],
        ["번아웃 위험도", analysis.burnoutLevel],
      ]
    : hasCompleteSpec
    ? [
        ["직무 적합도", "분석하기 필요"],
        ["포트폴리오 준비도", "분석하기 필요"],
        ["번아웃 위험도", "분석하기 필요"],
      ]
    : [
        ["직무 적합도", "스펙 등록 후 분석"],
        ["포트폴리오 준비도", "프로젝트 등록 후 제공"],
        ["번아웃 위험도", "학습/활동 정보 등록 후 분석"],
      ];

  useEffect(() => {
    const timerId = setInterval(() => {
      setActiveFeatureIndex((currentIndex) =>
        (currentIndex + 1) % homeFeatures.length
      );
    }, 3000);

    return () => clearInterval(timerId);
  }, []);

  useEffect(() => {
    if (analysis) {
      return undefined;
    }

    const timerId = setInterval(() => {
      setSampleReadiness(getRandomReadiness());
    }, 5000);

    return () => clearInterval(timerId);
  }, [analysis]);

  useEffect(() => {
    if (displayReadiness === targetReadiness) {
      return undefined;
    }

    const step = displayReadiness < targetReadiness ? 1 : -1;
    const timerId = setInterval(() => {
      setDisplayReadiness((currentValue) => {
        if (currentValue === targetReadiness) {
          clearInterval(timerId);
          return currentValue;
        }

        const nextValue = currentValue + step;
        if (
          (step > 0 && nextValue > targetReadiness) ||
          (step < 0 && nextValue < targetReadiness)
        ) {
          return targetReadiness;
        }

        return nextValue;
      });
    }, 28);

    return () => clearInterval(timerId);
  }, [displayReadiness, targetReadiness]);

  return (
    <main style={styles.container}>
      <style>{animations}</style>
      <Header />

      <section style={styles.hero}>
        <div style={styles.copyStack}>
          <div style={styles.backPlate}></div>
          <div style={styles.copyArea}>
            <p style={styles.badge}>AI Career Manager</p>

            <h1 style={styles.title}>
              AI 커리어 매니저가
              <br />
              <span style={styles.noWrap}>취업 준비를 설계합니다.</span>
            </h1>

            <p style={styles.description}>
              목표 직무에 맞춰 부족한 역량을 찾고,
              <br />
              포트폴리오로 남길 수 있는 실무형 미션을 제안합니다.
            </p>

            <div style={styles.actions}>
              <button
                type="button"
                className="hero-action primary"
                style={styles.primaryAction}
                onClick={() => navigate(primaryActionPath)}
              >
                {primaryActionLabel}
              </button>
              <button
                type="button"
                className="hero-action secondary"
                style={styles.secondaryAction}
                onClick={() => navigate(routes.mission)}
              >
                맞춤 미션 추천
              </button>
            </div>
          </div>
        </div>

        <div style={styles.panelStack}>
          <div style={styles.panelPlate}></div>
          <aside style={styles.aiPanel}>
            <div style={styles.panelHeader}>
              <span style={styles.statusDot}></span>
              <span style={styles.panelLabel}>Sample Career Scan</span>
            </div>

            <div style={styles.scoreBox}>
              <p style={styles.scoreLabel}>{readinessLabel}</p>
              <strong style={styles.score}>{displayReadiness}%</strong>
              <div style={styles.scoreTrack}>
                <span
                  style={{
                    ...styles.scoreFill,
                    width: `${displayReadiness}%`,
                  }}
                ></span>
              </div>
            </div>

            <div style={styles.metricList}>
              {panelMetrics.map(([label, value]) => (
                <div key={label} style={styles.metricItem}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
          </aside>
        </div>

        <section style={styles.workflowPanel} aria-label="서비스 사용 흐름">
          <p style={styles.workflowLabel}>서비스 이용 흐름</p>
          {workflowSteps.map((step, index) => (
            <div key={step.title} style={styles.workflowStep}>
              <span style={styles.workflowNumber}>0{index + 1}</span>
              <div style={styles.workflowText}>
                <strong style={styles.workflowTitle}>{step.title}</strong>
                <span style={styles.workflowDescription}>{step.text}</span>
              </div>
              {index < workflowSteps.length - 1 && (
                <span style={styles.workflowArrow}>→</span>
              )}
            </div>
          ))}
        </section>

        <section style={styles.featureSlider}>
        <div style={styles.sliderWindow}>
          <div
            style={{
              ...styles.sliderTrack,
              transform: `translateX(-${activeFeatureIndex * 100}%)`,
            }}
          >
            {homeFeatures.map((feature, slideIndex) => (
              <article key={feature.title} style={styles.radarCard}>
                <div style={styles.radarHeader}>
                  <div>
                    <p style={styles.radarEyebrow}>Career Radar 미리보기</p>
                    <h2 style={styles.featureTitle}>{feature.title}</h2>
                  </div>
                  <div style={styles.scanStatus}>
                    <span style={styles.scanDot}></span>
                    {feature.status}
                  </div>
                </div>

                <div className="radar-body" style={styles.radarBody}>
                  <div style={styles.radarVisual}>
                    <div style={styles.radarRing}>
                      <span style={styles.radarSweep}></span>
                      <strong style={styles.radarScore}>{feature.scoreValue}</strong>
                      <span style={styles.radarScoreLabel}>
                        {feature.scoreLabel}
                      </span>
                    </div>
                  </div>

                  <div style={styles.radarContent}>
                    <p style={styles.featureCount}>
                      0{slideIndex + 1} / 0{homeFeatures.length}
                    </p>
                    <p style={styles.featureText}>{feature.text}</p>
                    <div style={styles.progressTrack}>
                      <span
                        style={{
                          ...styles.progressFill,
                          width: feature.progress,
                        }}
                      ></span>
                    </div>
                    <p style={styles.radarInsight}>{feature.insight}</p>
                  </div>
                </div>

                <div className="radar-metric-grid" style={styles.metricGrid}>
                  {feature.metrics.map(([label, value]) => (
                    <div key={label} style={styles.radarMetric}>
                      <span>{label}</span>
                      <strong>{value}</strong>
                    </div>
                  ))}
                </div>

                <div className="next-action" style={styles.nextAction}>
                  <span>다음 추천 행동</span>
                  <strong>{feature.action}</strong>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div style={styles.indicatorList}>
          {homeFeatures.map((feature, index) => (
            <button
              key={feature.title}
              type="button"
              className={
                index === activeFeatureIndex
                  ? "feature-indicator active"
                  : "feature-indicator"
              }
              aria-label={`${feature.title} 보기`}
              style={
                index === activeFeatureIndex
                  ? { ...styles.indicator, ...styles.activeIndicator }
                  : styles.indicator
              }
              onClick={() => setActiveFeatureIndex(index)}
            />
          ))}
        </div>
        </section>
      </section>

    </main>
  );
}

const animations = `
.hero-action {
  border: 0;
  cursor: pointer;
  transition:
    background 180ms ease,
    border-color 180ms ease,
    color 180ms ease,
    box-shadow 180ms ease,
    transform 180ms ease;
}

.hero-action.primary:hover {
  background: linear-gradient(135deg, #1d4ed8, #0891b2) !important;
  box-shadow: 0 18px 34px rgba(29, 78, 216, 0.38), inset 0 1px 0 rgba(255, 255, 255, 0.3) !important;
}

.hero-action.primary:active {
  background: linear-gradient(135deg, #1e40af, #0e7490) !important;
  transform: translateY(0) scale(0.98) !important;
}

.hero-action.secondary:hover {
  background: rgba(37, 99, 235, 0.1) !important;
  border-color: rgba(37, 99, 235, 0.34) !important;
  color: #1d4ed8 !important;
}

.hero-action.secondary:active {
  background: rgba(37, 99, 235, 0.18) !important;
  transform: scale(0.98);
}

.feature-indicator {
  transition:
    background 180ms ease,
    box-shadow 180ms ease,
    transform 180ms ease,
    width 180ms ease;
}

.feature-indicator:hover {
  background: rgba(37, 99, 235, 0.42) !important;
  box-shadow: 0 8px 16px rgba(37, 99, 235, 0.22) !important;
}

.feature-indicator.active:hover {
  background: linear-gradient(90deg, #1d4ed8, #0891b2) !important;
}

.feature-indicator:active {
  background: #1d4ed8 !important;
  transform: scale(0.9);
}

@keyframes radarSweep {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

@media (max-width: 760px) {
  .radar-body {
    grid-template-columns: 1fr !important;
  }

  .radar-metric-grid {
    grid-template-columns: 1fr !important;
  }

  .next-action {
    align-items: flex-start !important;
    flex-direction: column !important;
  }
}
`;

const styles = {
  container: {
    height: "100vh",
    background:
      "radial-gradient(circle at 12% 8%, rgba(37, 99, 235, 0.2), transparent 28%), radial-gradient(circle at 88% 12%, rgba(6, 182, 212, 0.22), transparent 26%), radial-gradient(circle at 52% 92%, rgba(124, 58, 237, 0.12), transparent 30%), linear-gradient(135deg, #f8fafc 0%, #eef6ff 48%, #f8fbff 100%)",
    padding: 0,
    fontFamily: "Arial, sans-serif",
    color: "#0f172a",
    overflow: "hidden",
  },
  hero: {
    width: "min(1440px, calc(100% - clamp(32px, 6vw, 96px)))",
    height: "calc(100vh - 58px)",
    margin: "0 auto",
    padding: "clamp(14px, 2.2vw, 24px) 0 clamp(12px, 2vw, 20px)",
    boxSizing: "border-box",
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gridTemplateRows: "auto auto auto",
    gap: "clamp(12px, 2.2vh, 18px) clamp(14px, 2vw, 24px)",
    alignContent: "center",
    alignItems: "start",
    perspective: "1200px",
  },
  copyStack: {
    position: "relative",
    minHeight: 0,
    maxHeight: "none",
    transform: "translateY(-44px)",
    transformStyle: "preserve-3d",
  },
  backPlate: {
    position: "absolute",
    inset: "12px -8px -10px 14px",
    borderRadius: "24px",
    background: "linear-gradient(135deg, rgba(37, 99, 235, 0.18), rgba(6, 182, 212, 0.12))",
    filter: "blur(2px)",
    transform: "translateZ(-42px)",
  },
  copyArea: {
    position: "relative",
    minHeight: "100%",
    height: "clamp(300px, 34vh, 380px)",
    padding: "clamp(26px, 5vw, 44px)",
    borderRadius: "28px",
    background: "linear-gradient(145deg, rgba(255, 255, 255, 0.72), rgba(239, 246, 255, 0.4))",
    border: "1px solid rgba(255, 255, 255, 0.86)",
    boxShadow:
      "0 34px 80px rgba(15, 23, 42, 0.16), 0 8px 22px rgba(37, 99, 235, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.78)",
    backdropFilter: "blur(22px) saturate(150%)",
    transform: "rotateX(1deg) rotateY(-2deg)",
    overflow: "hidden",
  },
  badge: {
    display: "inline-block",
    padding: "9px 14px",
    borderRadius: "999px",
    backgroundColor: "rgba(37, 99, 235, 0.1)",
    color: "#2563eb",
    fontWeight: "bold",
    fontSize: "14px",
    marginBottom: "22px",
    border: "1px solid rgba(37, 99, 235, 0.18)",
    boxShadow: "0 10px 22px rgba(37, 99, 235, 0.12)",
  },
  title: {
    maxWidth: "780px",
    fontSize: "clamp(30px, 5vw, 46px)",
    lineHeight: "1.16",
    color: "#0f172a",
    margin: "0 0 22px",
    textShadow: "0 1px 0 rgba(255, 255, 255, 0.8)",
    wordBreak: "keep-all",
    overflowWrap: "normal",
  },
  noWrap: {
    whiteSpace: "nowrap",
  },
  description: {
    maxWidth: "720px",
    fontSize: "clamp(16px, 2vw, 18px)",
    lineHeight: "1.8",
    color: "#475569",
    margin: "0 0 30px",
  },
  actions: {
    display: "flex",
    flexWrap: "wrap",
    gap: "12px",
    transform: "translateY(-10px)",
  },
  primaryAction: {
    padding: "14px 18px",
    borderRadius: "14px",
    background: "linear-gradient(135deg, #2563eb, #06b6d4)",
    color: "#ffffff",
    fontWeight: "bold",
    boxShadow: "0 16px 30px rgba(37, 99, 235, 0.32), inset 0 1px 0 rgba(255, 255, 255, 0.28)",
    transform: "translateY(-2px)",
  },
  secondaryAction: {
    padding: "14px 18px",
    borderRadius: "14px",
    background: "rgba(255, 255, 255, 0.56)",
    color: "#334155",
    fontWeight: "bold",
    border: "1px solid rgba(226, 232, 240, 0.9)",
    boxShadow: "0 12px 24px rgba(15, 23, 42, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.72)",
  },
  panelStack: {
    position: "relative",
    minHeight: 0,
    maxHeight: "none",
    transform: "translateY(-44px)",
    transformStyle: "preserve-3d",
  },
  panelPlate: {
    position: "absolute",
    inset: "14px 10px -12px -8px",
    borderRadius: "24px",
    background: "linear-gradient(145deg, rgba(37, 99, 235, 0.28), rgba(124, 58, 237, 0.2))",
    filter: "blur(1px)",
    transform: "translateZ(-46px)",
  },
  aiPanel: {
    position: "relative",
    minHeight: "100%",
    height: "clamp(300px, 34vh, 380px)",
    padding: "clamp(22px, 4vw, 26px)",
    borderRadius: "28px",
    background:
      "linear-gradient(155deg, rgba(15, 23, 42, 0.92), rgba(30, 41, 59, 0.78)), radial-gradient(circle at top right, rgba(6, 182, 212, 0.28), transparent 36%)",
    color: "#e2e8f0",
    boxShadow:
      "0 34px 90px rgba(15, 23, 42, 0.34), 0 14px 34px rgba(37, 99, 235, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
    border: "1px solid rgba(226, 232, 240, 0.16)",
    backdropFilter: "blur(18px)",
    transform: "rotateX(2deg) rotateY(4deg) translateY(-10px)",
    overflow: "hidden",
  },
  panelHeader: {
    display: "flex",
    alignItems: "center",
    gap: "9px",
    marginBottom: "26px",
  },
  statusDot: {
    width: "9px",
    height: "9px",
    borderRadius: "50%",
    backgroundColor: "#22c55e",
    boxShadow: "0 0 18px #22c55e",
  },
  panelLabel: {
    color: "#cbd5e1",
    fontSize: "14px",
    fontWeight: "bold",
  },
  scoreBox: {
    padding: "22px",
    borderRadius: "20px",
    background:
      "linear-gradient(135deg, rgba(37, 99, 235, 0.34), rgba(6, 182, 212, 0.16), rgba(124, 58, 237, 0.18))",
    border: "1px solid rgba(148, 163, 184, 0.22)",
    marginBottom: "18px",
    boxShadow: "0 20px 36px rgba(2, 6, 23, 0.24), inset 0 1px 0 rgba(255, 255, 255, 0.12)",
  },
  scoreLabel: {
    margin: "0 0 8px",
    color: "#cbd5e1",
    fontSize: "14px",
  },
  score: {
    color: "#ffffff",
    fontSize: "clamp(30px, 5vw, 46px)",
  },
  scoreTrack: {
    height: "8px",
    marginTop: "12px",
    borderRadius: "999px",
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    overflow: "hidden",
  },
  scoreFill: {
    display: "block",
    width: "78%",
    height: "100%",
    borderRadius: "999px",
    background: "linear-gradient(90deg, #60a5fa, #22d3ee)",
    boxShadow: "0 0 18px rgba(34, 211, 238, 0.5)",
    transition: "width 420ms cubic-bezier(0.22, 1, 0.36, 1)",
  },
  metricList: {
    display: "grid",
    gap: "10px",
  },
  metricItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    padding: "13px 14px",
    borderRadius: "14px",
    background: "linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.035))",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    color: "#cbd5e1",
    fontSize: "14px",
    boxShadow: "0 12px 22px rgba(2, 6, 23, 0.16)",
  },
  workflowPanel: {
    gridColumn: "1 / -1",
    width: "min(900px, 100%)",
    margin: "0 auto",
    padding: "10px 12px",
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: "8px",
    borderRadius: "18px",
    background: "linear-gradient(145deg, rgba(255, 255, 255, 0.62), rgba(239, 246, 255, 0.34))",
    border: "1px solid rgba(255, 255, 255, 0.78)",
    boxShadow: "0 16px 34px rgba(15, 23, 42, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.72)",
    backdropFilter: "blur(16px) saturate(140%)",
  },
  workflowLabel: {
    gridColumn: "1 / -1",
    margin: "0 0 2px",
    color: "#2563eb",
    fontSize: "12px",
    fontWeight: "bold",
  },
  workflowStep: {
    position: "relative",
    minWidth: 0,
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "8px 12px",
    borderRadius: "14px",
    background: "rgba(255, 255, 255, 0.52)",
    border: "1px solid rgba(226, 232, 240, 0.82)",
  },
  workflowNumber: {
    flex: "0 0 auto",
    width: "30px",
    height: "30px",
    display: "grid",
    placeItems: "center",
    borderRadius: "50%",
    background: "linear-gradient(135deg, #2563eb, #06b6d4)",
    color: "#ffffff",
    fontSize: "12px",
    fontWeight: "bold",
    boxShadow: "0 10px 18px rgba(37, 99, 235, 0.22)",
  },
  workflowText: {
    minWidth: 0,
    display: "grid",
    gap: "2px",
    color: "#475569",
    fontSize: "12px",
    lineHeight: "1.35",
  },
  workflowTitle: {
    color: "#0f172a",
    fontSize: "14px",
  },
  workflowDescription: {
    color: "#64748b",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  workflowArrow: {
    position: "absolute",
    right: "-12px",
    zIndex: 1,
    color: "#2563eb",
    fontWeight: "bold",
    fontSize: "16px",
  },
  featureSlider: {
    width: "min(760px, 100%)",
    gridColumn: "1 / -1",
    margin: "0 auto",
    display: "grid",
    gap: "8px",
    minHeight: 0,
  },
  sliderWindow: {
    overflow: "hidden",
    borderRadius: "18px",
    padding: 0,
    background: "rgba(255, 255, 255, 0.62)",
    boxShadow: "0 16px 34px rgba(15, 23, 42, 0.1), 0 5px 14px rgba(37, 99, 235, 0.08)",
  },
  sliderTrack: {
    display: "flex",
    transition: "transform 1200ms cubic-bezier(0.22, 1, 0.36, 1)",
    willChange: "transform",
  },
  radarCard: {
    position: "relative",
    flex: "0 0 100%",
    width: "100%",
    boxSizing: "border-box",
    minHeight: "230px",
    padding: "clamp(16px, 2vw, 22px)",
    borderRadius: 0,
    background:
      "linear-gradient(145deg, rgba(255, 255, 255, 0.76), rgba(239, 246, 255, 0.44)), radial-gradient(circle at 18% 18%, rgba(37, 99, 235, 0.16), transparent 34%), radial-gradient(circle at 90% 22%, rgba(6, 182, 212, 0.18), transparent 30%)",
    border: 0,
    boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.76)",
    backdropFilter: "blur(18px) saturate(140%)",
  },
  radarHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: "18px",
    alignItems: "flex-start",
    marginBottom: "7px",
  },
  radarEyebrow: {
    margin: "0 0 5px",
    color: "#2563eb",
    fontSize: "12px",
    fontWeight: "bold",
    letterSpacing: "0",
  },
  scanStatus: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    padding: "5px 8px",
    borderRadius: "999px",
    background: "rgba(15, 23, 42, 0.06)",
    color: "#334155",
    fontSize: "12px",
    fontWeight: "bold",
    whiteSpace: "nowrap",
  },
  scanDot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    background: "#22c55e",
    boxShadow: "0 0 14px rgba(34, 197, 94, 0.8)",
  },
  radarBody: {
    display: "grid",
    gridTemplateColumns: "minmax(90px, 110px) 1fr",
    gap: "clamp(10px, 1.8vw, 14px)",
    alignItems: "center",
  },
  radarVisual: {
    display: "grid",
    placeItems: "center",
  },
  radarRing: {
    position: "relative",
    width: "min(92px, 40vw)",
    aspectRatio: "1",
    display: "grid",
    placeItems: "center",
    overflow: "hidden",
    borderRadius: "50%",
    background:
      "repeating-radial-gradient(circle, rgba(37, 99, 235, 0.08) 0 1px, transparent 1px 26px), conic-gradient(from 120deg, rgba(37, 99, 235, 0.2), rgba(6, 182, 212, 0.58), rgba(37, 99, 235, 0.08), rgba(37, 99, 235, 0.2))",
    border: "1px solid rgba(37, 99, 235, 0.18)",
    boxShadow: "inset 0 0 34px rgba(37, 99, 235, 0.12), 0 20px 34px rgba(15, 23, 42, 0.1)",
  },
  radarSweep: {
    position: "absolute",
    inset: "50% 50% 0 0",
    transformOrigin: "100% 0",
    background: "linear-gradient(90deg, rgba(34, 211, 238, 0.58), transparent)",
    animation: "radarSweep 4s linear infinite",
  },
  radarScore: {
    position: "relative",
    color: "#0f172a",
    fontSize: "clamp(23px, 4vw, 30px)",
    lineHeight: "1",
  },
  radarScoreLabel: {
    position: "absolute",
    bottom: "19px",
    color: "#475569",
    fontSize: "9px",
    fontWeight: "bold",
  },
  radarContent: {
    minWidth: 0,
  },
  featureCount: {
    margin: 0,
    color: "#2563eb",
    fontSize: "12px",
    fontWeight: "bold",
  },
  featureTitle: {
    margin: "0 0 5px",
    color: "#0f172a",
    fontSize: "clamp(15px, 2.2vw, 18px)",
    lineHeight: "1.2",
  },
  featureText: {
    margin: "4px 0 7px",
    color: "#475569",
    fontSize: "12px",
    lineHeight: "1.38",
  },
  progressTrack: {
    height: "7px",
    borderRadius: "999px",
    background: "rgba(37, 99, 235, 0.12)",
    overflow: "hidden",
    marginBottom: "7px",
  },
  progressFill: {
    display: "block",
    height: "100%",
    borderRadius: "999px",
    background: "linear-gradient(90deg, #2563eb, #06b6d4)",
    boxShadow: "0 0 18px rgba(6, 182, 212, 0.34)",
  },
  radarInsight: {
    margin: 0,
    color: "#334155",
    fontSize: "12px",
    lineHeight: "1.38",
  },
  metricGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: "6px",
    marginTop: "6px",
  },
  radarMetric: {
    display: "grid",
    gap: "4px",
    padding: "5px 7px",
    borderRadius: "10px",
    background: "rgba(255, 255, 255, 0.62)",
    border: "1px solid rgba(226, 232, 240, 0.9)",
    color: "#64748b",
    fontSize: "11px",
    boxShadow: "0 12px 22px rgba(15, 23, 42, 0.06)",
  },
  nextAction: {
    marginTop: "5px",
    padding: "7px 9px",
    display: "flex",
    justifyContent: "space-between",
    gap: "14px",
    borderRadius: "13px",
    background: "linear-gradient(135deg, rgba(15, 23, 42, 0.92), rgba(30, 41, 59, 0.86))",
    color: "#cbd5e1",
    fontSize: "12px",
  },
  indicatorList: {
    display: "flex",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: "9px",
  },
  indicator: {
    width: "10px",
    height: "10px",
    padding: 0,
    border: "none",
    borderRadius: "999px",
    backgroundColor: "rgba(37, 99, 235, 0.18)",
    cursor: "pointer",
    boxShadow: "0 6px 14px rgba(37, 99, 235, 0.12)",
  },
  activeIndicator: {
    width: "32px",
    background: "linear-gradient(90deg, #2563eb, #06b6d4)",
  },
};

export default Home;
