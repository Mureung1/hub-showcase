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

const steps = ["스펙 등록", "AI 분석", "미션 수행", "피드백", "포트폴리오"];

function ProjectIntro() {
  return (
    <main style={styles.container}>
      <section style={styles.hero}>
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
            <span style={styles.primaryAction}>AI 커리어 분석</span>
            <span style={styles.secondaryAction}>맞춤 미션 추천</span>
          </div>
        </div>

        <aside style={styles.aiPanel}>
          <div style={styles.panelHeader}>
            <span style={styles.statusDot}></span>
            <span style={styles.panelLabel}>Live Career Scan</span>
          </div>

          <div style={styles.scoreBox}>
            <p style={styles.scoreLabel}>Career Readiness</p>
            <strong style={styles.score}>78%</strong>
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
      </section>

      <section style={styles.featureGrid}>
        {features.map((feature) => (
          <article key={feature.title} style={styles.featureCard}>
            <h2 style={styles.featureTitle}>{feature.title}</h2>
            <p style={styles.featureText}>{feature.text}</p>
          </article>
        ))}
      </section>

      <section style={styles.flowSection}>
        <h2 style={styles.sectionTitle}>서비스 흐름</h2>
        <div style={styles.stepList}>
          {steps.map((step) => (
            <span key={step} style={styles.stepItem}>
              {step}
            </span>
          ))}
        </div>
      </section>

      <section style={styles.goalSection}>
        <h2 style={styles.sectionTitle}>서비스 목표</h2>
        <p style={styles.goalText}>
          단순히 더 많은 스펙을 쌓게 하는 것이 아니라, 대학생이 실무 경험을
          만들고 포트폴리오로 연결하며, 지치지 않고 취업 준비를 이어갈 수
          있도록 돕는 것이 목표입니다.
        </p>
      </section>
    </main>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at top left, rgba(37, 99, 235, 0.18), transparent 30%), radial-gradient(circle at top right, rgba(6, 182, 212, 0.2), transparent 28%), #f8fafc",
    padding: "56px 20px",
    fontFamily: "Arial, sans-serif",
    color: "#0f172a",
  },
  hero: {
    width: "100%",
    maxWidth: "1120px",
    margin: "0 auto",
    display: "grid",
    gridTemplateColumns: "minmax(0, 1.35fr) minmax(280px, 0.65fr)",
    gap: "28px",
    alignItems: "stretch",
  },
  copyArea: {
    padding: "44px",
    borderRadius: "28px",
    backgroundColor: "rgba(255, 255, 255, 0.78)",
    border: "1px solid rgba(226, 232, 240, 0.9)",
    boxShadow: "0 24px 70px rgba(15, 23, 42, 0.12)",
    backdropFilter: "blur(16px)",
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
  },
  title: {
    maxWidth: "780px",
    fontSize: "46px",
    lineHeight: "1.16",
    color: "#0f172a",
    margin: "0 0 22px",
  },
  description: {
    maxWidth: "720px",
    fontSize: "18px",
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
    boxShadow: "0 12px 28px rgba(37, 99, 235, 0.28)",
  },
  secondaryAction: {
    padding: "14px 18px",
    borderRadius: "14px",
    backgroundColor: "#ffffff",
    color: "#334155",
    fontWeight: "bold",
    border: "1px solid #e2e8f0",
  },
  aiPanel: {
    padding: "26px",
    borderRadius: "28px",
    backgroundColor: "rgba(15, 23, 42, 0.92)",
    color: "#e2e8f0",
    boxShadow: "0 24px 70px rgba(15, 23, 42, 0.22)",
    border: "1px solid rgba(148, 163, 184, 0.22)",
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
    background: "linear-gradient(135deg, rgba(37, 99, 235, 0.28), rgba(6, 182, 212, 0.18))",
    border: "1px solid rgba(148, 163, 184, 0.22)",
    marginBottom: "18px",
  },
  scoreLabel: {
    margin: "0 0 12px",
    color: "#cbd5e1",
    fontSize: "14px",
  },
  score: {
    color: "#ffffff",
    fontSize: "46px",
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
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    color: "#cbd5e1",
    fontSize: "14px",
  },
  featureGrid: {
    maxWidth: "1120px",
    margin: "28px auto 0",
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "16px",
  },
  featureCard: {
    padding: "22px",
    borderRadius: "20px",
    backgroundColor: "rgba(255, 255, 255, 0.82)",
    border: "1px solid #e2e8f0",
    boxShadow: "0 14px 34px rgba(15, 23, 42, 0.08)",
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
  flowSection: {
    maxWidth: "1120px",
    margin: "28px auto 0",
    padding: "28px",
    borderRadius: "24px",
    backgroundColor: "rgba(255, 255, 255, 0.72)",
    border: "1px solid #e2e8f0",
  },
  sectionTitle: {
    margin: "0 0 16px",
    color: "#0f172a",
    fontSize: "22px",
  },
  stepList: {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
  },
  stepItem: {
    padding: "11px 14px",
    borderRadius: "999px",
    backgroundColor: "#eff6ff",
    color: "#2563eb",
    fontSize: "14px",
    fontWeight: "bold",
    border: "1px solid rgba(37, 99, 235, 0.14)",
  },
  goalSection: {
    maxWidth: "1120px",
    margin: "28px auto 0",
    padding: "30px",
    borderRadius: "24px",
    backgroundColor: "#0f172a",
    color: "#ffffff",
  },
  goalText: {
    maxWidth: "860px",
    margin: 0,
    color: "#cbd5e1",
    fontSize: "17px",
    lineHeight: "1.8",
  },
};

export default ProjectIntro;
