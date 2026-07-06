function ProjectIntro() {
  return (
    <div style={styles.container}>
      <h1 style={styles.title}>⚡ 번개모임</h1>
      <p style={styles.subtitle}>
        "지금 당장" 같이할 사람을 찾는 가장 빠른 방법
      </p>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>이런 경험 있으신가요?</h2>
        <ul style={styles.list}>
          <li>갑자기 저녁에 풋살 하고 싶은데 같이 할 사람이 없어요</li>
          <li>방학 동안 토익 공부를 하고 싶은데 혼자면 집중이 안 돼요</li>
          <li>동네에서 즉흥적으로 같이 밥 먹을 사람을 구하고 싶어요</li>
        </ul>
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>번개모임이 해결해드려요</h2>
        <div style={styles.cardWrapper}>
          <div style={styles.card}>
            <h3>🏃 번개모임</h3>
            <p>당일치기, 즉흥적인 소규모 모임</p>
            <p style={styles.example}>예: 오늘 저녁 7시 풋살 4명 모집</p>
          </div>
          <div style={styles.card}>
            <h3>📚 소모임</h3>
            <p>기간을 정해 꾸준히 함께하는 스터디/취미 모임</p>
            <p style={styles.example}>예: 방학 2개월 토익 스터디 모집</p>
          </div>
        </div>
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>주요 기능</h2>
        <ul style={styles.list}>
          <li>모임 등록: 시간, 장소, 인원, 주제 설정</li>
          <li>모임 검색 및 필터링 (카테고리, 지역, 날짜)</li>
          <li>참여 신청 및 채팅으로 소통</li>
        </ul>
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: "700px",
    margin: "0 auto",
    padding: "40px 20px",
    fontFamily: "sans-serif",
    lineHeight: "1.6",
  },
  title: {
    fontSize: "36px",
    marginBottom: "8px",
  },
  subtitle: {
    fontSize: "18px",
    color: "#666",
    marginBottom: "32px",
  },
  section: {
    marginBottom: "32px",
  },
  sectionTitle: {
    fontSize: "22px",
    marginBottom: "12px",
    borderBottom: "2px solid #eee",
    paddingBottom: "6px",
  },
  list: {
    paddingLeft: "20px",
  },
  cardWrapper: {
    display: "flex",
    gap: "16px",
    flexWrap: "wrap",
  },
  card: {
    flex: "1",
    minWidth: "250px",
    border: "1px solid #ddd",
    borderRadius: "12px",
    padding: "16px",
    backgroundColor: "#fafafa",
  },
  example: {
    fontSize: "14px",
    color: "#888",
    fontStyle: "italic",
  },
};

export default ProjectIntro;