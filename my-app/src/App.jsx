import React from "react";

/**
 * TopicIntro
 * 프로젝트 주제(소상공인을 위한 네이버 블로그 마케팅 AI 에이전트)를 소개하는 컴포넌트.
 * 외부 라이브러리 없이 순수 React + 인라인 스타일로만 구성했습니다.
 */
function TopicIntro() {
  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <span style={styles.eyebrow}>PROJECT INTRO</span>

        <h1 style={styles.title}>
          소상공인을 위한
          <br />
          네이버 블로그 마케팅 AI 에이전트
        </h1>

        <p style={styles.subtitle}>
          바쁜 사장님을 대신해 블로그 글감 기획부터 초안 작성, 발행 타이밍
          제안까지 도와주는 마케팅 파트너입니다.
        </p>

        <div style={styles.divider} />

        <div style={styles.problemBox}>
          <p style={styles.problemLabel}>왜 필요한가요?</p>
          <p style={styles.problemText}>
            많은 소상공인이 “블로그가 중요한 건 알지만, 글 쓸 시간이 없다”는
            문제를 겪고 있습니다. 이 서비스는 그 부담을 AI가 대신 짊어지는
            것을 목표로 합니다.
          </p>
        </div>

        <div style={styles.featureGrid}>
          {features.map((f) => (
            <div key={f.title} style={styles.featureItem}>
              <p style={styles.featureTitle}>{f.title}</p>
              <p style={styles.featureDesc}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const features = [
  {
    title: "글감 추천",
    desc: "업종·시즌·주변 이슈를 분석해 오늘 쓸 글 주제를 제안해요.",
  },
  {
    title: "초안 자동 작성",
    desc: "사장님이 입력한 키워드로 블로그 초안을 만들어줘요.",
  },
  {
    title: "발행 타이밍 제안",
    desc: "검색 유입이 잘 되는 요일·시간대를 알려줘요.",
  },
];

const styles = {
  wrapper: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "40px 16px",
    backgroundColor: "#F5F6F5",
    fontFamily:
      "'Pretendard', -apple-system, BlinkMacSystemFont, 'Malgun Gothic', sans-serif",
  },
  card: {
    width: "100%",
    maxWidth: "560px",
    backgroundColor: "#FFFFFF",
    borderRadius: "16px",
    border: "1px solid #E4E6E1",
    padding: "40px 36px",
    boxSizing: "border-box",
  },
  eyebrow: {
    display: "inline-block",
    fontSize: "12px",
    fontWeight: 700,
    letterSpacing: "0.08em",
    color: "#03C75A",
    marginBottom: "14px",
  },
  title: {
    fontSize: "28px",
    lineHeight: 1.35,
    fontWeight: 700,
    color: "#1B1F1C",
    margin: "0 0 16px 0",
  },
  subtitle: {
    fontSize: "15px",
    lineHeight: 1.6,
    color: "#5B615C",
    margin: "0 0 28px 0",
  },
  divider: {
    height: "1px",
    backgroundColor: "#E4E6E1",
    margin: "0 0 24px 0",
  },
  problemBox: {
    backgroundColor: "#EFFAF3",
    borderRadius: "10px",
    padding: "18px 20px",
    marginBottom: "28px",
  },
  problemLabel: {
    fontSize: "13px",
    fontWeight: 700,
    color: "#03C75A",
    margin: "0 0 8px 0",
  },
  problemText: {
    fontSize: "14px",
    lineHeight: 1.6,
    color: "#33372F",
    margin: 0,
  },
  featureGrid: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  featureItem: {
    borderLeft: "3px solid #03C75A",
    paddingLeft: "14px",
  },
  featureTitle: {
    fontSize: "15px",
    fontWeight: 700,
    color: "#1B1F1C",
    margin: "0 0 4px 0",
  },
  featureDesc: {
    fontSize: "13px",
    lineHeight: 1.5,
    color: "#5B615C",
    margin: 0,
  },
};

export default TopicIntro;