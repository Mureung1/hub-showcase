// Dashboard.jsx — 주변 경쟁업체 목록 화면 (목 데이터 버전)
// 오늘의 미션: 서버 없이 목 데이터로 화면 흐름 먼저 확인
// 지침대로 컴포넌트를 잘게 나누지 않고 하나의 큰 컴포넌트에 모아둠
// 상태(state)에 따라 화면이 바뀌는 과정을 확인하는 것이 핵심

import { useState } from "react";

// ── 스타일 상수 (design-skill.md 기준) ──
const GREEN = "#03C75A";
const BG_PAGE = "#0D0F0E";
const BG_CARD = "#1A1D1B";
const BG_CARD_ALT = "#16181A";
const BG_REPORT = "#12241A";
const BORDER = "#2A2E2B";
const TEXT_SECONDARY = "#9CA3AF";
const TEXT_MUTED = "#6B7280";
const RED = "#E24B4A";

// ── 목(Mock) 데이터 ──
// 실제로는 나중에 서버(FastAPI)에서 받아올 데이터.
// 오늘은 가짜 데이터로 화면이 제대로 도는지 먼저 확인한다.
const MOCK_COMPETITORS = [
  {
    id: 1,
    name: "보노베리",
    distance: 0.5,
    address: "서울시 강남구 압구정로",
    positive_ratio: 72,
    total_reviews: 18,
    keywords: ["디저트", "분위기"],
    // 상세 분석용 데이터 (카드 클릭 시 표시)
    detail: {
      positive: 13,
      negative: 5,
      keyword_ranking: [
        { keyword: "디저트", count: 8 },
        { keyword: "분위기", count: 6 },
        { keyword: "친절", count: 4 },
        { keyword: "웨이팅", count: 3 },
      ],
      report: "디저트와 분위기에서 강한 긍정 반응을 얻고 있어 벤치마킹이 필요합니다. 웨이팅 불만이 일부 있어, 대기시간 관리가 공략 포인트가 될 수 있습니다.",
      reviews: [
        { sentiment: "긍정", keywords: ["디저트"], content: "케이크가 정말 맛있어요. 재방문 의사 있습니다.", summary: "디저트 만족" },
        { sentiment: "긍정", keywords: ["분위기"], content: "인테리어가 예쁘고 사진 찍기 좋아요.", summary: "분위기 좋음" },
        { sentiment: "부정", keywords: ["웨이팅"], content: "주말엔 웨이팅이 너무 길어요.", summary: "대기 시간이 김" },
      ],
    },
  },
  {
    id: 2,
    name: "카페 그린노트",
    distance: 1.2,
    address: "서울시 강남구 청담동",
    positive_ratio: 54,
    total_reviews: 25,
    keywords: ["웨이팅", "가격"],
    detail: {
      positive: 14,
      negative: 11,
      keyword_ranking: [
        { keyword: "웨이팅", count: 9 },
        { keyword: "가격", count: 7 },
        { keyword: "커피", count: 5 },
        { keyword: "주차", count: 4 },
      ],
      report: "커피 맛은 긍정적이나 웨이팅과 가격 불만이 많습니다. 합리적인 가격과 빠른 응대를 강조하면 차별화가 가능합니다.",
      reviews: [
        { sentiment: "긍정", keywords: ["커피"], content: "커피 맛이 훌륭합니다.", summary: "커피 만족" },
        { sentiment: "부정", keywords: ["가격"], content: "가격이 좀 비싼 편이에요.", summary: "가격 부담" },
        { sentiment: "부정", keywords: ["웨이팅"], content: "자리 나기까지 오래 걸렸어요.", summary: "대기 시간이 김" },
      ],
    },
  },
  {
    id: 3,
    name: "스누쿠 커피",
    distance: 1.8,
    address: "서울시 강남구 신사동",
    positive_ratio: 61,
    total_reviews: 12,
    keywords: ["조용함", "커피"],
    detail: {
      positive: 7,
      negative: 5,
      keyword_ranking: [
        { keyword: "조용함", count: 5 },
        { keyword: "커피", count: 4 },
        { keyword: "좁음", count: 3 },
      ],
      report: "조용한 분위기와 커피 맛이 강점입니다. 공간이 좁다는 불만이 있어, 넓은 좌석을 강조하면 좋습니다.",
      reviews: [
        { sentiment: "긍정", keywords: ["조용함"], content: "작업하기 좋은 조용한 카페예요.", summary: "조용한 분위기" },
        { sentiment: "부정", keywords: ["좁음"], content: "자리가 좁아서 불편했어요.", summary: "공간이 좁음" },
      ],
    },
  },
];

// ── 감성 도넛 (긍정률 원형 게이지) ──
function SentimentDonut({ ratio }) {
  const R = 52;
  const C = 2 * Math.PI * R;
  return (
    <div style={{ position: "relative", width: 112, height: 112, flexShrink: 0 }}>
      <svg viewBox="0 0 128 128" width="112" height="112" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="64" cy="64" r={R} fill="none" stroke={BORDER} strokeWidth="13" />
        <circle cx="64" cy="64" r={R} fill="none" stroke={GREEN} strokeWidth="13"
          strokeLinecap="round" strokeDasharray={`${C * ratio / 100} ${C}`} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: 20, fontWeight: 700, color: "#fff" }}>{ratio}%</span>
      </div>
    </div>
  );
}

export default function Dashboard() {
  // ── 상태(state) 정의 ──
  // storeName: 입력창에 입력한 내 가게 이름
  // competitors: 검색된 주변 경쟁업체 목록 (없으면 아직 검색 안 한 상태)
  // selected: 클릭해서 상세를 보고 있는 업체 (없으면 목록 화면)
  const [storeName, setStoreName] = useState("");
  const [competitors, setCompetitors] = useState(null);
  const [selected, setSelected] = useState(null);

  // 검색 버튼 → 목 데이터를 상태에 넣음 (실제로는 나중에 서버 호출)
  const handleSearch = () => {
    if (!storeName.trim()) return;
    setCompetitors(MOCK_COMPETITORS);
    setSelected(null);
  };

  const wrap = {
    minHeight: "100vh", backgroundColor: BG_PAGE, color: "#fff",
    fontFamily: "'Pretendard', -apple-system, sans-serif",
  };
  const inner = { maxWidth: 720, margin: "0 auto", padding: "48px 24px" };

  return (
    <div style={wrap}>
      <style>{`@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css');`}</style>
      <div style={inner}>

        {/* ── 헤더 + 검색 ── */}
        <p style={{ fontSize: 11, color: GREEN, fontWeight: 700, letterSpacing: "0.15em", margin: "0 0 6px" }}>
          AI MYSTERY SHOPPER
        </p>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 16px" }}>
          내 가게 주변 경쟁업체 분석
        </h1>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="내 가게 이름 입력 (예: 스타벅스 강남점)"
            style={{ flex: 1, backgroundColor: BG_CARD, border: `1px solid ${BORDER}`,
              borderRadius: 12, padding: "12px 14px", color: "#fff", fontSize: 14, outline: "none" }}
          />
          <button onClick={handleSearch}
            style={{ backgroundColor: GREEN, color: "#04342C", fontSize: 13, fontWeight: 700,
              padding: "12px 20px", borderRadius: 999, border: "none", cursor: "pointer" }}>
            주변 분석
          </button>
        </div>

        {/* ── 상태에 따라 화면이 갈라짐 ── */}
        {/* competitors가 없으면: 아직 검색 안 한 초기 화면 */}
        {!competitors && (
          <p style={{ fontSize: 14, color: TEXT_MUTED, marginTop: 40, textAlign: "center" }}>
            내 가게 이름을 입력하면 주변 2km 내 경쟁업체를 분석합니다.
          </p>
        )}

        {/* selected가 없으면: 경쟁업체 목록 화면 */}
        {competitors && !selected && (
          <div style={{ marginTop: 24 }}>
            <p style={{ fontSize: 12, color: TEXT_MUTED, margin: "0 0 12px" }}>
              반경 2km 내 경쟁업체 {competitors.length}곳
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {competitors.map((c) => (
                <div key={c.id} onClick={() => setSelected(c)}
                  style={{ backgroundColor: BG_CARD, borderRadius: 16, padding: 18,
                    border: `1px solid ${BORDER}`, cursor: "pointer" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                    <div>
                      <p style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>{c.name}</p>
                      <p style={{ fontSize: 12, color: TEXT_SECONDARY, margin: "4px 0 0" }}>
                        {c.distance}km · {c.address}
                      </p>
                    </div>
                    <span style={{ fontSize: 11, color: TEXT_MUTED }}>자세히 ›</span>
                  </div>
                  <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                    <div style={{ flex: 1, backgroundColor: BG_CARD_ALT, borderRadius: 10, padding: "8px 10px" }}>
                      <p style={{ fontSize: 10, color: TEXT_SECONDARY, margin: 0 }}>긍정률</p>
                      <p style={{ fontSize: 17, fontWeight: 700, color: GREEN, margin: "2px 0 0" }}>{c.positive_ratio}%</p>
                    </div>
                    <div style={{ flex: 1, backgroundColor: BG_CARD_ALT, borderRadius: 10, padding: "8px 10px" }}>
                      <p style={{ fontSize: 10, color: TEXT_SECONDARY, margin: 0 }}>리뷰</p>
                      <p style={{ fontSize: 17, fontWeight: 700, margin: "2px 0 0" }}>{c.total_reviews}건</p>
                    </div>
                    <div style={{ flex: 2, backgroundColor: BG_CARD_ALT, borderRadius: 10, padding: "8px 10px" }}>
                      <p style={{ fontSize: 10, color: TEXT_SECONDARY, margin: 0 }}>주요 키워드</p>
                      <p style={{ fontSize: 13, fontWeight: 500, margin: "3px 0 0" }}>{c.keywords.join(" · ")}</p>
                    </div>
                  </div>
                  {/* 긍정/부정 비율 바 */}
                  <div style={{ height: 6, backgroundColor: BORDER, borderRadius: 999, overflow: "hidden", display: "flex" }}>
                    <div style={{ width: `${c.positive_ratio}%`, backgroundColor: GREEN }} />
                    <div style={{ width: `${100 - c.positive_ratio}%`, backgroundColor: RED }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* selected가 있으면: 상세 분석 화면 */}
        {selected && (
          <div style={{ marginTop: 24 }}>
            <button onClick={() => setSelected(null)}
              style={{ background: "none", border: "none", color: GREEN, fontSize: 13,
                cursor: "pointer", padding: 0, marginBottom: 16 }}>
              ‹ 목록으로 돌아가기
            </button>

            <h2 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px" }}>{selected.name}</h2>
            <p style={{ fontSize: 12, color: TEXT_SECONDARY, margin: "0 0 20px" }}>
              {selected.distance}km · {selected.address}
            </p>

            {/* 통계 카드 4개 */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 12 }}>
              {[
                { label: "총 리뷰", value: `${selected.total_reviews}건`, color: "#fff" },
                { label: "긍정", value: `${selected.detail.positive}건`, color: GREEN },
                { label: "부정", value: `${selected.detail.negative}건`, color: RED },
                { label: "긍정률", value: `${selected.positive_ratio}%`, color: "#fff" },
              ].map((s) => (
                <div key={s.label} style={{ backgroundColor: BG_CARD, borderRadius: 16, padding: 16 }}>
                  <p style={{ fontSize: 12, color: TEXT_SECONDARY, margin: 0 }}>{s.label}</p>
                  <p style={{ fontSize: 22, fontWeight: 700, color: s.color, margin: "8px 0 0" }}>{s.value}</p>
                </div>
              ))}
            </div>

            {/* 도넛 + 키워드 */}
            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 12, marginBottom: 12 }}>
              <div style={{ backgroundColor: BG_CARD, borderRadius: 16, padding: 20, display: "flex", alignItems: "center", gap: 24 }}>
                <SentimentDonut ratio={selected.positive_ratio} />
                <div>
                  <p style={{ fontSize: 12, color: TEXT_SECONDARY, margin: 0 }}>감성 분석</p>
                  <p style={{ fontSize: 14, color: "#D1D5DB", margin: "6px 0 0", lineHeight: 1.6 }}>
                    긍정 {selected.detail.positive}건<br />부정 {selected.detail.negative}건
                  </p>
                </div>
              </div>
              <div style={{ backgroundColor: BG_CARD, borderRadius: 16, padding: 20 }}>
                <p style={{ fontSize: 12, color: TEXT_SECONDARY, margin: "0 0 14px" }}>키워드 순위</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {selected.detail.keyword_ranking.map((k) => {
                    const max = selected.detail.keyword_ranking[0].count;
                    return (
                      <div key={k.keyword}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                          <span>{k.keyword}</span><span style={{ color: TEXT_MUTED }}>{k.count}회</span>
                        </div>
                        <div style={{ height: 6, backgroundColor: BORDER, borderRadius: 999 }}>
                          <div style={{ width: `${(k.count / max) * 100}%`, height: "100%", backgroundColor: GREEN, borderRadius: 999 }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* AI 리포트 */}
            <div style={{ backgroundColor: BG_REPORT, border: "1px solid #1E3A2A", borderRadius: 16, padding: 20, marginBottom: 12 }}>
              <p style={{ fontSize: 12, color: GREEN, fontWeight: 700, margin: "0 0 8px" }}>AI 전략 리포트</p>
              <p style={{ fontSize: 14, color: "#D1D5DB", lineHeight: 1.7, margin: 0 }}>{selected.detail.report}</p>
            </div>

            {/* 리뷰 목록 */}
            <div style={{ backgroundColor: BG_CARD, borderRadius: 16, padding: 20 }}>
              <p style={{ fontSize: 12, color: TEXT_SECONDARY, margin: "0 0 12px" }}>분석된 리뷰</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {selected.detail.reviews.map((r, i) => (
                  <div key={i} style={{ backgroundColor: BG_CARD_ALT, borderRadius: 12, padding: 14 }}>
                    <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 999,
                        backgroundColor: r.sentiment === "긍정" ? BG_REPORT : "#2A1414",
                        color: r.sentiment === "긍정" ? GREEN : "#F09595" }}>
                        {r.sentiment}
                      </span>
                      {r.keywords.map((k) => (
                        <span key={k} style={{ fontSize: 11, padding: "3px 10px", borderRadius: 999,
                          backgroundColor: BORDER, color: TEXT_SECONDARY }}>#{k}</span>
                      ))}
                    </div>
                    <p style={{ fontSize: 14, color: "#D1D5DB", margin: 0, lineHeight: 1.6 }}>{r.content}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}