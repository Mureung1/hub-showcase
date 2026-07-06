import { useEffect, useState } from "react";

// 자산군별 구성 데이터 (합계 100%)
const ASSETS = [
  { key: "equity", label: "주식", ratio: 38, color: "#C9A227" },
  { key: "bond", label: "채권", ratio: 24, color: "#5C7A99" },
  { key: "realestate", label: "부동산", ratio: 18, color: "#6F9C76" },
  { key: "cash", label: "현금성 자산", ratio: 12, color: "#A8A296" },
  { key: "alt", label: "대체투자", ratio: 8, color: "#B36B5E" },
];

const FEATURES = [
  {
    title: "기업 분석",
    desc: "재무제표와 성장성, 업종 지표를 분석해 개별 기업의 투자 매력도를 점수화합니다.",
  },
  {
    title: "투자 추천",
    desc: "내 자산 규모와 투자 성향에 맞는 종목과 자산군별 투자 비중을 추천합니다.",
  },
  {
    title: "리밸런싱 제안",
    desc: "시장 변화와 기업 실적을 반영해 조정이 필요한 시점과 방법을 알려줍니다.",
  },
];

// SVG 도넛 링 치수
const SIZE = 220;
const STROKE = 22;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function ProjectIntro() {
  const [built, setBuilt] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setBuilt(true), 200);
    return () => clearTimeout(timer);
  }, []);

  // 각 세그먼트의 누적 시작 각도(퍼센트 기준) 계산
  let cumulative = 0;
  const segments = ASSETS.map((asset) => {
    const start = cumulative;
    cumulative += asset.ratio;
    return { ...asset, start };
  });

  return (
    <div style={styles.page}>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .ring-segment {
          transition: stroke-dashoffset 1.1s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .fade-item {
          opacity: 0;
          animation: fadeUp 0.6s ease-out forwards;
        }
      `}</style>

      <div style={styles.hero}>
        <div style={{ ...styles.copy, ...fadeStyle(0) }}>
          <p style={styles.eyebrow}>투자 분석 프로젝트</p>
          <h1 style={styles.title}>
            무엇에 투자할지,
            <br />
            데이터로 답하다
          </h1>
          <p style={styles.subtitle}>
            내 자산 규모와 투자 성향을 바탕으로 기업과 자산군을 분석하고,
            지금 어디에 얼마나 투자하면 좋을지 추천해주는 서비스입니다.
          </p>
        </div>

        <div style={{ ...styles.ringWrap, ...fadeStyle(0.15) }}>
          <svg
            width={SIZE}
            height={SIZE}
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            role="img"
            aria-label="추천 포트폴리오 비중 도넛 차트"
          >
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke="#1B2C3D"
              strokeWidth={STROKE}
            />
            {segments.map((seg) => {
              const arcLength = (seg.ratio / 100) * CIRCUMFERENCE;
              const rotation = (seg.start / 100) * 360 - 90;
              const dashOffset = built
                ? CIRCUMFERENCE - arcLength
                : CIRCUMFERENCE;
              return (
                <circle
                  key={seg.key}
                  className="ring-segment"
                  cx={SIZE / 2}
                  cy={SIZE / 2}
                  r={RADIUS}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth={STROKE}
                  strokeDasharray={CIRCUMFERENCE}
                  strokeDashoffset={dashOffset}
                  strokeLinecap="butt"
                  transform={`rotate(${rotation} ${SIZE / 2} ${SIZE / 2})`}
                />
              );
            })}
            <text
              x="50%"
              y="47%"
              textAnchor="middle"
              style={{ fill: "#E8E2D0", fontSize: 13, fontFamily: "sans-serif" }}
            >
              추천 포트폴리오
            </text>
            <text
              x="50%"
              y="58%"
              textAnchor="middle"
              style={{ fill: "#8A97A3", fontSize: 12, fontFamily: "sans-serif" }}
            >
              5개 자산군 비중
            </text>
          </svg>

          <ul style={styles.legend}>
            {ASSETS.map((asset, i) => (
              <li key={asset.key} style={{ ...styles.legendItem, ...fadeStyle(0.2 + i * 0.05) }}>
                <span style={{ ...styles.dot, background: asset.color }} />
                <span style={styles.legendLabel}>{asset.label}</span>
                <span style={styles.legendRatio}>{asset.ratio}%</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div style={styles.divider} />

      <div style={styles.features}>
        {FEATURES.map((f, i) => (
          <div key={f.title} style={{ ...styles.featureItem, ...fadeStyle(0.4 + i * 0.1) }}>
            <p style={styles.featureTitle}>{f.title}</p>
            <p style={styles.featureDesc}>{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function fadeStyle(delay) {
  return { animation: `fadeUp 0.6s ease-out ${delay}s forwards` };
}

const styles = {
  page: {
    background: "#101E2B",
    color: "#E8E2D0",
    fontFamily:
      "'Georgia', 'Noto Serif KR', serif",
    padding: "48px 40px",
    borderRadius: 16,
    maxWidth: 760,
    margin: "0 auto",
  },
  hero: {
    display: "flex",
    flexWrap: "wrap",
    gap: 40,
    alignItems: "center",
    justifyContent: "space-between",
  },
  copy: {
    flex: "1 1 320px",
    minWidth: 280,
  },
  eyebrow: {
    fontFamily: "'Helvetica Neue', Arial, sans-serif",
    fontSize: 13,
    letterSpacing: "0.14em",
    color: "#C9A227",
    marginBottom: 12,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 34,
    lineHeight: 1.25,
    margin: "0 0 16px",
    fontWeight: 600,
    color: "#F3EFE4",
  },
  subtitle: {
    fontFamily: "'Helvetica Neue', Arial, sans-serif",
    fontSize: 15,
    lineHeight: 1.7,
    color: "#B7BFC6",
    maxWidth: 420,
  },
  ringWrap: {
    flex: "0 0 auto",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 16,
  },
  legend: {
    listStyle: "none",
    margin: 0,
    padding: 0,
    display: "flex",
    flexDirection: "column",
    gap: 6,
    fontFamily: "'Helvetica Neue', Arial, sans-serif",
    width: 200,
  },
  legendItem: {
    display: "flex",
    alignItems: "center",
    fontSize: 13,
    color: "#CFCABC",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    display: "inline-block",
    marginRight: 8,
    flexShrink: 0,
  },
  legendLabel: {
    flex: 1,
  },
  legendRatio: {
    fontFamily: "'Courier New', monospace",
    color: "#8A97A3",
  },
  divider: {
    height: 1,
    background: "rgba(232, 226, 208, 0.15)",
    margin: "40px 0 32px",
  },
  features: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: 24,
  },
  featureItem: {
    borderTop: "1px solid rgba(232, 226, 208, 0.25)",
    paddingTop: 14,
  },
  featureTitle: {
    fontFamily: "'Helvetica Neue', Arial, sans-serif",
    fontSize: 15,
    fontWeight: 600,
    color: "#F3EFE4",
    margin: "0 0 6px",
  },
  featureDesc: {
    fontFamily: "'Helvetica Neue', Arial, sans-serif",
    fontSize: 13.5,
    lineHeight: 1.6,
    color: "#9BA3A9",
    margin: 0,
  },
};
