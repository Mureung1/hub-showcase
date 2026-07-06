function ProjectIntro() {
  return (
    <main style={styles.container}>
      <section style={styles.card}>
        <p style={styles.badge}>AI Career Manager</p>

        <h1 style={styles.title}>
          지속 가능한 취업 준비를 도와주는 AI 커리어 매니저
        </h1>

        <p style={styles.description}>
          Career Mission AI는 취업 준비에 어려움을 겪는 대학생을 위해 AI가
          개인의 목표 직무와 현재 역량을 분석하고, 맞춤형 실무 미션을 제공하는
          서비스입니다.
        </p>

        <div style={styles.section}>
          <h2 style={styles.subtitle}>주요 기능</h2>
          <ul style={styles.list}>
            <li>목표 직무와 현재 스펙 기반 AI 역량 분석</li>
            <li>개인 맞춤형 실무 미션 생성</li>
            <li>제출 결과물에 대한 AI 피드백 제공</li>
            <li>프로젝트 경험을 포트폴리오로 자동 정리</li>
            <li>컨디션 체크를 통한 번아웃 위험 감지</li>
            <li>학습과 휴식의 균형을 위한 AI 휴식 추천</li>
          </ul>
        </div>

        <div style={styles.section}>
          <h2 style={styles.subtitle}>서비스 목표</h2>
          <p style={styles.text}>
            단순히 더 많은 스펙을 쌓게 하는 것이 아니라, 대학생이 실무 경험을
            만들고 포트폴리오로 연결하며, 지치지 않고 취업 준비를 이어갈 수
            있도록 돕는 것이 목표입니다.
          </p>
        </div>
      </section>
    </main>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    backgroundColor: "#f4f7fb",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "40px 20px",
    fontFamily: "Arial, sans-serif",
  },
  card: {
    maxWidth: "760px",
    backgroundColor: "#ffffff",
    borderRadius: "20px",
    padding: "40px",
    boxShadow: "0 10px 30px rgba(0, 0, 0, 0.08)",
  },
  badge: {
    display: "inline-block",
    padding: "8px 14px",
    borderRadius: "999px",
    backgroundColor: "#e8f0ff",
    color: "#2563eb",
    fontWeight: "bold",
    fontSize: "14px",
    marginBottom: "20px",
  },
  title: {
    fontSize: "34px",
    lineHeight: "1.3",
    color: "#1f2937",
    marginBottom: "20px",
  },
  description: {
    fontSize: "18px",
    lineHeight: "1.7",
    color: "#4b5563",
    marginBottom: "32px",
  },
  section: {
    marginTop: "28px",
  },
  subtitle: {
    fontSize: "22px",
    color: "#111827",
    marginBottom: "12px",
  },
  list: {
    paddingLeft: "22px",
    lineHeight: "1.9",
    color: "#374151",
    fontSize: "16px",
  },
  text: {
    fontSize: "16px",
    lineHeight: "1.8",
    color: "#374151",
  },
};

export default ProjectIntro;
