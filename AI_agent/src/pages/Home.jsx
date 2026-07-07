import { useEffect, useState } from "react";
import Header from "../components/layout/Header";

const features = [
  {
    title: "AI 역량 분석",
    text: "목표 직무와 현재 스펙의 차이를 분석해 우선 보완할 역량을 보여줍니다.",
  },
  {
    title: "맞춤 미션 생성",
    text: "포트폴리오로 연결할 수 있는 실무형 미션을 개인 상태에 맞게 추천합니다.",
  },
  {
    title: "AI 피드백",
    text: "제출한 결과물의 강점과 개선점을 정리해 다음 행동으로 이어지게 합니다.",
  },
  {
    title: "번아웃 케어",
    text: "컨디션 체크를 통해 무리한 취업 준비를 줄이고 적절한 휴식을 제안합니다.",
  },
];

function Home() {
  const [activeFeatureIndex, setActiveFeatureIndex] = useState(0);
  const activeFeature = features[activeFeatureIndex];

  useEffect(() => {
    const timerId = setInterval(() => {
      setActiveFeatureIndex((currentIndex) =>
        currentIndex === features.length - 1 ? 0 : currentIndex + 1
      );
    }, 3000);

    return () => clearInterval(timerId);
  }, []);

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
              스펙을 실무 경험으로 바꾸는 AI 커리어 매니저
            </h1>

            <p style={styles.description}>
              Career Mission AI는 취업 준비에 어려움을 겪는 대학생을 위해 목표
              직무와 현재 역량을 분석하고, 포트폴리오로 연결되는 맞춤형 실무
              미션을 제안하는 서비스입니다.
            </p>

            <div style={styles.actions}>
              <button
                type="button"
                className="hero-action primary"
                style={styles.primaryAction}
              >
                AI 커리어 분석
              </button>
              <button
                type="button"
                className="hero-action secondary"
                style={styles.secondaryAction}
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
              <span style={styles.panelLabel}>Live Career Scan</span>
            </div>

            <div style={styles.scoreBox}>
              <p style={styles.scoreLabel}>Career Readiness</p>
              <strong style={styles.score}>78%</strong>
              <div style={styles.scoreTrack}>
                <span style={styles.scoreFill}></span>
              </div>
            </div>

            <div style={styles.metricList}>
              <div style={styles.metricItem}>
                <span>직무 적합도</span>
                <strong>High</strong>
              </div>
              <div style={styles.metricItem}>
                <span>포트폴리오 준비도</span>
                <strong>Medium</strong>
              </div>
              <div style={styles.metricItem}>
                <span>번아웃 위험도</span>
                <strong>Low</strong>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section style={styles.featureSlider}>
        <div style={styles.sliderWindow}>
          <article key={activeFeature.title} style={styles.featureCard}>
            <span style={styles.featureAccent}></span>
            <p style={styles.featureCount}>
              {activeFeatureIndex + 1} / {features.length}
            </p>
            <h2 style={styles.featureTitle}>{activeFeature.title}</h2>
            <p style={styles.featureText}>{activeFeature.text}</p>
          </article>
        </div>

        <div style={styles.indicatorList}>
          {features.map((feature, index) => (
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

    </main>
  );
}

const animations = `
@keyframes featureSlideIn {
  0% {
    opacity: 0;
    transform: translateX(34px) scale(0.985) rotateX(3deg) rotateY(-3deg);
    filter: blur(4px);
  }
  100% {
    opacity: 1;
    transform: translateX(0) scale(1) rotateX(2deg) rotateY(-2deg);
    filter: blur(0);
  }
}

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
`;

const styles = {
  container: {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at 12% 8%, rgba(37, 99, 235, 0.2), transparent 28%), radial-gradient(circle at 88% 12%, rgba(6, 182, 212, 0.22), transparent 26%), radial-gradient(circle at 52% 92%, rgba(124, 58, 237, 0.12), transparent 30%), linear-gradient(135deg, #f8fafc 0%, #eef6ff 48%, #f8fbff 100%)",
    padding: "0 0 56px",
    fontFamily: "Arial, sans-serif",
    color: "#0f172a",
    overflowX: "hidden",
  },
  hero: {
    width: "min(1440px, calc(100% - clamp(32px, 6vw, 96px)))",
    margin: "0 auto",
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 360px), 1fr))",
    gap: "clamp(18px, 3vw, 40px)",
    alignItems: "stretch",
    perspective: "1200px",
  },
  copyStack: {
    position: "relative",
    transformStyle: "preserve-3d",
  },
  backPlate: {
    position: "absolute",
    inset: "18px -12px -14px 18px",
    borderRadius: "30px",
    background: "linear-gradient(135deg, rgba(37, 99, 235, 0.18), rgba(6, 182, 212, 0.12))",
    filter: "blur(2px)",
    transform: "translateZ(-42px)",
  },
  copyArea: {
    position: "relative",
    minHeight: "100%",
    padding: "clamp(26px, 5vw, 44px)",
    borderRadius: "28px",
    background: "linear-gradient(145deg, rgba(255, 255, 255, 0.72), rgba(239, 246, 255, 0.4))",
    border: "1px solid rgba(255, 255, 255, 0.86)",
    boxShadow:
      "0 34px 80px rgba(15, 23, 42, 0.16), 0 8px 22px rgba(37, 99, 235, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.78)",
    backdropFilter: "blur(22px) saturate(150%)",
    transform: "rotateX(1deg) rotateY(-2deg)",
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
    transformStyle: "preserve-3d",
  },
  panelPlate: {
    position: "absolute",
    inset: "22px 16px -18px -10px",
    borderRadius: "30px",
    background: "linear-gradient(145deg, rgba(37, 99, 235, 0.28), rgba(124, 58, 237, 0.2))",
    filter: "blur(1px)",
    transform: "translateZ(-46px)",
  },
  aiPanel: {
    position: "relative",
    minHeight: "100%",
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
    margin: "0 0 12px",
    color: "#cbd5e1",
    fontSize: "14px",
  },
  score: {
    color: "#ffffff",
    fontSize: "clamp(30px, 5vw, 46px)",
  },
  scoreTrack: {
    height: "8px",
    marginTop: "16px",
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
  },
  metricList: {
    display: "grid",
    gap: "10px",
  },
  metricItem: {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    padding: "13px 14px",
    borderRadius: "14px",
    background: "linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.035))",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    color: "#cbd5e1",
    fontSize: "14px",
    boxShadow: "0 12px 22px rgba(2, 6, 23, 0.16)",
  },
  featureSlider: {
    width: "min(720px, calc(100% - clamp(32px, 6vw, 96px)))",
    margin: "clamp(28px, 4vw, 44px) auto 0",
    display: "grid",
    gap: "16px",
    perspective: "1000px",
  },
  sliderWindow: {
    overflow: "hidden",
    borderRadius: "24px",
    padding: "4px",
  },
  featureCard: {
    position: "relative",
    minHeight: "190px",
    padding: "clamp(24px, 5vw, 30px)",
    borderRadius: "20px",
    background: "linear-gradient(145deg, rgba(255, 255, 255, 0.68), rgba(239, 246, 255, 0.36))",
    border: "1px solid rgba(255, 255, 255, 0.76)",
    boxShadow:
      "0 22px 42px rgba(15, 23, 42, 0.1), 0 6px 16px rgba(37, 99, 235, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.7)",
    backdropFilter: "blur(18px) saturate(140%)",
    transform: "rotateX(2deg) rotateY(-2deg)",
    animation: "featureSlideIn 900ms cubic-bezier(0.22, 1, 0.36, 1) both",
  },
  featureAccent: {
    display: "block",
    width: "38px",
    height: "5px",
    borderRadius: "999px",
    background: "linear-gradient(90deg, #2563eb, #06b6d4)",
    marginBottom: "16px",
    boxShadow: "0 8px 18px rgba(37, 99, 235, 0.22)",
  },
  featureCount: {
    position: "absolute",
    top: "24px",
    right: "26px",
    margin: 0,
    color: "#2563eb",
    fontSize: "13px",
    fontWeight: "bold",
  },
  featureTitle: {
    margin: "0 0 10px",
    color: "#0f172a",
    fontSize: "18px",
  },
  featureText: {
    margin: 0,
    color: "#475569",
    fontSize: "15px",
    lineHeight: "1.7",
  },
  indicatorList: {
    display: "flex",
    justifyContent: "center",
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


