// Dashboard.jsx — 검색 → 후보 선택 → 경쟁업체 목록(실 데이터) → 상세 분석(목 데이터) 흐름
// 1~3단계는 백엔드(카카오 로컬 API + Supabase) 연동, 4단계 상세분석은 Gemini 할당량 문제로 목 데이터 유지

import { useState, useEffect, useRef } from "react";

const API_BASE = import.meta.env.PROD ? "" : "http://localhost:8000";

const GREEN = "#03C75A";
const BG_PAGE = "#F5F6F8";
const BG_CARD = "#FFFFFF";
const BG_CARD_ALT = "#F1F3F5";
const BG_REPORT = "#EAF7EF";
const BORDER = "#E5E7EB";
const TEXT_PRIMARY = "#111827";
const TEXT_SECONDARY = "#6B7280";
const TEXT_MUTED = "#9CA3AF";
const RED = "#D64545";
const BORDER_REPORT = "#BFE8CC";
const DANGER_BG = "#FDEDED";

// 4단계(상세분석)는 이번 범위에서 제외 — AI 리포트 문구/리뷰 목록은 고정 목데이터, 통계 수치만 업체별로 랜덤 생성한다.
const MOCK_KEYWORD_POOL = ["친절", "맛", "가격", "웨이팅", "주차", "분위기", "청결", "재방문"];

const MOCK_REPORT_TEXT =
  "아직 실제 리뷰 분석 전입니다. (예시) 전반적으로 긍정적인 반응을 얻고 있어 벤치마킹이 필요합니다. 일부 아쉬운 의견도 있어 개선 포인트로 참고하면 좋습니다.";

const MOCK_REVIEWS = [
  { sentiment: "긍정", keywords: ["디저트"], content: "케이크가 정말 맛있어요. 재방문 의사 있습니다." },
  { sentiment: "긍정", keywords: ["분위기"], content: "인테리어가 예쁘고 사진 찍기 좋아요." },
  { sentiment: "부정", keywords: ["웨이팅"], content: "주말엔 웨이팅이 너무 길어요." },
];

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// 업체 하나에 대한 랜덤 목 분석 데이터를 생성 — handleSelectCandidate에서 업체당 1회만 호출하고
// 그 결과를 competitors state에 저장해서 재사용한다(렌더링 중에는 절대 호출하지 않음).
function generateMockAnalysis() {
  const positive_ratio = randomInt(60, 85);
  const negative_ratio = 100 - positive_ratio;
  const total_reviews = randomInt(5, 30);
  const positive = Math.round((total_reviews * positive_ratio) / 100);
  const negative = total_reviews - positive;

  const shuffled = [...MOCK_KEYWORD_POOL].sort(() => Math.random() - 0.5);
  const keyword_ranking = shuffled
    .slice(0, randomInt(3, 4))
    .map((keyword) => ({ keyword, count: randomInt(2, 10) }))
    .sort((a, b) => b.count - a.count);
  const keywords = keyword_ranking.map((k) => k.keyword);

  return {
    positive_ratio,
    negative_ratio,
    total_reviews,
    keywords,
    detail: { positive, negative, keyword_ranking, report: MOCK_REPORT_TEXT, reviews: MOCK_REVIEWS },
  };
}

// "종합 요약" 섹션용 목 데이터 — 실제 리뷰 분석 연동 전까지 사용
const SUMMARY_GOOD_POINTS = ["친절한 응대", "접근성 좋음", "다양한 메뉴"];
const SUMMARY_BAD_POINTS = ["웨이팅 김", "주차 불편", "협소한 좌석"];
const SUMMARY_AVG_POSITIVE_RATIO = 68;

// ─────────────────────────────────────────────────────────
// 1단계: 이용 방법 안내 (3단계 아이콘 플로우)
// ─────────────────────────────────────────────────────────
function HowToGuide() {
  const steps = [
    {
      title: "1. 가게 검색",
      desc: "이름으로 검색하고 동네를 좁혀보세요",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="10" cy="10" r="6" />
          <line x1="20" y1="20" x2="14.8" y2="14.8" />
        </svg>
      ),
    },
    {
      title: "2. 주변 업체 확인",
      desc: "반경 내 가게를 거리순으로 확인",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 21s-7-6.5-7-11a7 7 0 0 1 14 0c0 4.5-7 11-7 11z" />
          <circle cx="12" cy="10" r="2.5" />
        </svg>
      ),
    },
    {
      title: "3. 분석 확인",
      desc: "리뷰 분석과 전략 리포트 확인",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="20" x2="5" y2="12" />
          <line x1="12" y1="20" x2="12" y2="6" />
          <line x1="19" y1="20" x2="19" y2="15" />
        </svg>
      ),
    },
  ];

  const items = [];
  steps.forEach((s, i) => {
    items.push(
      <div key={`card-${i}`} style={{
        flex: 1, backgroundColor: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 18,
        textAlign: "center", minHeight: 156, display: "flex", flexDirection: "column", justifyContent: "center",
      }}>
        <div style={{ width: 40, height: 40, borderRadius: "50%", backgroundColor: BG_REPORT, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px" }}>
          {s.icon}
        </div>
        <p style={{ fontSize: 13, fontWeight: 700, color: TEXT_PRIMARY, margin: "0 0 4px" }}>{s.title}</p>
        <p style={{ fontSize: 11, color: TEXT_SECONDARY, lineHeight: 1.5, margin: 0 }}>{s.desc}</p>
      </div>
    );
    if (i < steps.length - 1) {
      items.push(
        <div key={`arrow-${i}`} style={{ display: "flex", alignItems: "center" }}>
          <span style={{ color: GREEN, fontWeight: 700, fontSize: 16 }}>›</span>
        </div>
      );
    }
  });

  return (
    <div style={{ display: "flex", alignItems: "stretch", gap: 12, marginTop: 20 }}>
      {items}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// 1단계: 가게 이름 검색
// ─────────────────────────────────────────────────────────
function SearchStep({ storeName, setStoreName, region, setRegion, regionAttempts, onSearch, onResearch, loading, error }) {
  const showRegionInput = regionAttempts > 0;
  const regionMessage = regionAttempts <= 1
    ? "검색 결과가 많아요. 동/구 이름으로 알려주세요 (예: 역삼동, 강남구)"
    : "아직 결과가 많아요. 학교·건물 이름보다 동/구 이름이 더 정확해요 (예: 역삼동, 서초구)";

  const regionInputRef = useRef(null);
  useEffect(() => {
    if (regionAttempts > 0 && regionInputRef.current) {
      regionInputRef.current.focus();
    }
  }, [regionAttempts]);

  return (
    <>
      <p style={{ fontSize: 11, color: GREEN, fontWeight: 700, letterSpacing: "0.15em", margin: "0 0 6px" }}>
        상권 스캐너
      </p>
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 16px" }}>내 가게 이름으로 주변 상권 분석하기</h1>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={storeName}
          onChange={(e) => setStoreName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSearch()}
          placeholder="가게 이름을 입력하세요"
          style={{ flex: 1, backgroundColor: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "12px 14px", color: TEXT_PRIMARY, fontSize: 14, outline: "none" }}
        />
        <button onClick={onSearch} disabled={loading}
          style={{ backgroundColor: GREEN, color: "#04342C", fontSize: 13, fontWeight: 700, padding: "12px 20px", borderRadius: 999, border: "none", cursor: loading ? "default" : "pointer", opacity: loading ? 0.7 : 1, whiteSpace: "nowrap", flexShrink: 0 }}>
          {loading ? "검색 중..." : "검색"}
        </button>
      </div>

      {!error && !showRegionInput && (
        <div style={{
          backgroundColor: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 20,
          marginTop: 16, marginBottom: 12,
        }}>
          <span style={{
            display: "inline-block", backgroundColor: "#EAF7EF", color: "#00A344",
            fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 999, marginBottom: 10,
          }}>
            이렇게 활용해보세요
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{
              width: 40, height: 40, borderRadius: "50%", backgroundColor: "#EAF7EF",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#03C75A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l1-5h16l1 5" />
                <path d="M4 9v10h16V9" />
                <path d="M9 21V13h6v8" />
              </svg>
            </div>
            <p style={{ fontSize: 15, color: TEXT_PRIMARY, lineHeight: 1.6, textAlign: "left", margin: 0 }}>
              내 가게 이름을 입력하면 <span style={{ color: "#00A344", fontWeight: 700 }}>주변 가게들</span>을 분석해드려요
            </p>
          </div>
        </div>
      )}

      {showRegionInput && (
        <div style={{ marginTop: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <button onClick={() => window.history.back()}
              style={{ background: "none", border: "none", color: GREEN, fontSize: 13, cursor: "pointer", padding: 0 }}>
              ‹ 이전으로 돌아가기
            </button>
            <button onClick={onResearch}
              style={{ background: "none", border: "none", color: GREEN, fontSize: 13, cursor: "pointer", padding: 0 }}>
              처음으로 돌아가기
            </button>
          </div>
          <p style={{ fontSize: 13, color: GREEN, margin: "0 0 8px" }}>{regionMessage}</p>
          <input
            ref={regionInputRef}
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSearch()}
            placeholder="동네 이름 입력"
            style={{ width: "100%", backgroundColor: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "12px 14px", color: TEXT_PRIMARY, fontSize: 14, outline: "none" }}
          />
        </div>
      )}

      {error && (
        <p style={{ fontSize: 13, color: RED, marginTop: 12 }}>{error}</p>
      )}
      {!error && !showRegionInput && <HowToGuide />}
    </>
  );
}

// ─────────────────────────────────────────────────────────
// 2단계: 동명 가게 후보 목록 (주소로 구분)
// ─────────────────────────────────────────────────────────
function CandidateList({ storeName, candidates, note, onSelect, onResearch }) {
  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <button onClick={() => window.history.back()}
          style={{ background: "none", border: "none", color: GREEN, fontSize: 13, cursor: "pointer", padding: 0 }}>
          ‹ 이전으로 돌아가기
        </button>
        <button onClick={onResearch}
          style={{ background: "none", border: "none", color: GREEN, fontSize: 13, cursor: "pointer", padding: 0 }}>
          처음으로 돌아가기
        </button>
      </div>
      <p style={{ fontSize: 12, color: TEXT_MUTED, margin: "0 0 12px" }}>
        "{storeName}" 검색 결과 {candidates.length}곳 — 가게를 선택하세요
      </p>
      {note && (
        <p style={{ fontSize: 12, color: TEXT_MUTED, margin: "0 0 12px" }}>{note}</p>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {candidates.map((c) => (
          <div key={c.id} onClick={() => onSelect(c)}
            style={{ backgroundColor: BG_CARD, borderRadius: 16, padding: 18, border: `1px solid ${BORDER}`, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <p style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>{c.name}</p>
              <p style={{ fontSize: 12, color: TEXT_SECONDARY, margin: "4px 0 0" }}>{c.address}</p>
            </div>
            <span style={{ fontSize: 11, color: TEXT_MUTED }}>선택 ›</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// 3단계: 주변 상권 종합 분석 (목 데이터)
// ─────────────────────────────────────────────────────────
function SummaryInsight() {
  return (
    <div style={{ backgroundColor: BG_REPORT, border: `1px solid ${BORDER_REPORT}`, borderRadius: 16, padding: 20, marginBottom: 20 }}>
      <p style={{ fontSize: 12, color: GREEN, fontWeight: 700, margin: "0 0 14px" }}>주변 상권 종합 분석</p>
      <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 16 }}>
        <SentimentDonut ratio={SUMMARY_AVG_POSITIVE_RATIO} />
        <div>
          <p style={{ fontSize: 12, color: TEXT_SECONDARY, margin: 0 }}>주변 업체 평균 긍정률</p>
          <p style={{ fontSize: 22, fontWeight: 700, color: TEXT_PRIMARY, margin: "4px 0 0" }}>{SUMMARY_AVG_POSITIVE_RATIO}%</p>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div>
          <p style={{ fontSize: 11, color: TEXT_SECONDARY, margin: "0 0 8px" }}>좋은 점</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {SUMMARY_GOOD_POINTS.map((p) => (
              <span key={p} style={{ fontSize: 13, color: TEXT_PRIMARY }}>
                <span style={{ color: GREEN }}>●</span> {p}
              </span>
            ))}
          </div>
        </div>
        <div>
          <p style={{ fontSize: 11, color: TEXT_SECONDARY, margin: "0 0 8px" }}>아쉬운 점</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {SUMMARY_BAD_POINTS.map((p) => (
              <span key={p} style={{ fontSize: 13, color: TEXT_PRIMARY }}>
                <span style={{ color: RED }}>●</span> {p}
              </span>
            ))}
          </div>
        </div>
      </div>
      <p style={{ fontSize: 11, color: TEXT_MUTED, margin: "14px 0 0" }}>
        이 요약은 예시 데이터입니다. 실제 리뷰 분석 연동은 추후 업데이트 예정입니다.
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// 3단계: 경쟁업체 카드
// ─────────────────────────────────────────────────────────
function CompetitorCard({ competitor, onClick }) {
  const c = competitor;
  const analyzed = c.positive_ratio !== undefined && c.positive_ratio !== null;
  return (
    <div onClick={onClick}
      style={{ backgroundColor: BG_CARD, borderRadius: 16, padding: 18, border: `1px solid ${BORDER}`, cursor: "pointer" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <div>
          <p style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>{c.name}</p>
          <p style={{ fontSize: 12, color: TEXT_SECONDARY, margin: "4px 0 0" }}>{c.distance}km · {c.address}</p>
        </div>
        <span style={{ fontSize: 11, color: TEXT_MUTED }}>자세히 ›</span>
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <div style={{ flex: 1, backgroundColor: BG_CARD_ALT, borderRadius: 10, padding: "8px 10px" }}>
          <p style={{ fontSize: 10, color: TEXT_SECONDARY, margin: 0 }}>긍정률</p>
          <p style={{ fontSize: 17, fontWeight: 700, color: analyzed ? GREEN : TEXT_MUTED, margin: "2px 0 0" }}>
            {analyzed ? `${c.positive_ratio}%` : "분석 전"}
          </p>
        </div>
        <div style={{ flex: 1, backgroundColor: BG_CARD_ALT, borderRadius: 10, padding: "8px 10px" }}>
          <p style={{ fontSize: 10, color: TEXT_SECONDARY, margin: 0 }}>리뷰</p>
          <p style={{ fontSize: 17, fontWeight: 700, color: analyzed ? TEXT_PRIMARY : TEXT_MUTED, margin: "2px 0 0" }}>
            {c.total_reviews !== undefined && c.total_reviews !== null ? `${c.total_reviews}건` : "분석 전"}
          </p>
        </div>
        <div style={{ flex: 2, backgroundColor: BG_CARD_ALT, borderRadius: 10, padding: "8px 10px" }}>
          <p style={{ fontSize: 10, color: TEXT_SECONDARY, margin: 0 }}>주요 키워드</p>
          <p style={{ fontSize: 13, fontWeight: 500, margin: "3px 0 0", color: c.keywords && c.keywords.length ? TEXT_PRIMARY : TEXT_MUTED }}>
            {c.keywords && c.keywords.length ? c.keywords.join(" · ") : "분석 전"}
          </p>
        </div>
      </div>
      <div style={{ height: 6, backgroundColor: BORDER, borderRadius: 999, overflow: "hidden", display: "flex" }}>
        {analyzed ? (
          <>
            <div style={{ width: `${c.positive_ratio}%`, backgroundColor: GREEN }} />
            <div style={{ width: `${100 - c.positive_ratio}%`, backgroundColor: RED }} />
          </>
        ) : (
          <div style={{ width: "100%", backgroundColor: BORDER }} />
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// 감성 분석 도넛 차트
// ─────────────────────────────────────────────────────────
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
        <span style={{ fontSize: 20, fontWeight: 700, color: TEXT_PRIMARY }}>{ratio}%</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// 4단계: 상세 분석 화면
// ─────────────────────────────────────────────────────────
function DetailView({ competitor, onHome }) {
  const c = competitor;
  const d = c.detail;
  const maxCount = d.keyword_ranking[0].count;
  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <button onClick={() => window.history.back()}
          style={{ background: "none", border: "none", color: GREEN, fontSize: 13, cursor: "pointer", padding: 0 }}>
          ‹ 이전으로 돌아가기
        </button>
        <button onClick={onHome}
          style={{ background: "none", border: "none", color: GREEN, fontSize: 13, cursor: "pointer", padding: 0 }}>
          처음으로 돌아가기
        </button>
      </div>
      <h2 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px" }}>{c.name}</h2>
      <p style={{ fontSize: 12, color: TEXT_SECONDARY, margin: "0 0 20px" }}>{c.distance}km · {c.address}</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 12 }}>
        {[
          { label: "총 리뷰", value: `${c.total_reviews}건`, color: TEXT_PRIMARY },
          { label: "긍정", value: `${d.positive}건`, color: GREEN },
          { label: "부정", value: `${d.negative}건`, color: RED },
          { label: "긍정률", value: `${c.positive_ratio}%`, color: TEXT_PRIMARY },
        ].map((s) => (
          <div key={s.label} style={{ backgroundColor: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 16 }}>
            <p style={{ fontSize: 12, color: TEXT_SECONDARY, margin: 0 }}>{s.label}</p>
            <p style={{ fontSize: 22, fontWeight: 700, color: s.color, margin: "8px 0 0" }}>{s.value}</p>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 12, marginBottom: 12 }}>
        <div style={{ backgroundColor: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 20, display: "flex", alignItems: "center", gap: 24 }}>
          <SentimentDonut ratio={c.positive_ratio} />
          <div>
            <p style={{ fontSize: 12, color: TEXT_SECONDARY, margin: 0 }}>감성 분석</p>
            <p style={{ fontSize: 14, color: TEXT_PRIMARY, margin: "6px 0 0", lineHeight: 1.6 }}>
              긍정 {d.positive}건<br />부정 {d.negative}건
            </p>
          </div>
        </div>
        <div style={{ backgroundColor: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 20 }}>
          <p style={{ fontSize: 12, color: TEXT_SECONDARY, margin: "0 0 14px" }}>키워드 순위</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {d.keyword_ranking.map((k) => (
              <div key={k.keyword}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                  <span>{k.keyword}</span><span style={{ color: TEXT_MUTED }}>{k.count}회</span>
                </div>
                <div style={{ height: 6, backgroundColor: BORDER, borderRadius: 999 }}>
                  <div style={{ width: `${(k.count / maxCount) * 100}%`, height: "100%", backgroundColor: GREEN, borderRadius: 999 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ backgroundColor: BG_REPORT, border: `1px solid ${BORDER_REPORT}`, borderRadius: 16, padding: 20, marginBottom: 12 }}>
        <p style={{ fontSize: 12, color: GREEN, fontWeight: 700, margin: "0 0 8px" }}>AI 전략 리포트</p>
        <p style={{ fontSize: 14, color: TEXT_PRIMARY, lineHeight: 1.7, margin: 0 }}>{d.report}</p>
      </div>

      <div style={{ backgroundColor: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 20 }}>
        <p style={{ fontSize: 12, color: TEXT_SECONDARY, margin: "0 0 12px" }}>분석된 리뷰</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {d.reviews.map((r, i) => (
            <div key={i} style={{ backgroundColor: BG_CARD_ALT, borderRadius: 12, padding: 14 }}>
              <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 999,
                  backgroundColor: r.sentiment === "긍정" ? BG_REPORT : DANGER_BG,
                  color: r.sentiment === "긍정" ? GREEN : RED,
                }}>{r.sentiment}</span>
                {r.keywords.map((k) => (
                  <span key={k} style={{ fontSize: 11, padding: "3px 10px", borderRadius: 999, backgroundColor: BORDER, color: TEXT_SECONDARY }}>#{k}</span>
                ))}
              </div>
              <p style={{ fontSize: 14, color: TEXT_PRIMARY, margin: 0, lineHeight: 1.6 }}>{r.content}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// 맨 위로 가기 플로팅 버튼
// ─────────────────────────────────────────────────────────
function ScrollToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 300);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="맨 위로"
      style={{
        position: "fixed", right: 24, bottom: 24, width: 44, height: 44, borderRadius: "50%",
        backgroundColor: GREEN, border: "none", cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50,
      }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#04342C" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="18 15 12 9 6 15" />
      </svg>
    </button>
  );
}

// ─────────────────────────────────────────────────────────
// 부모 컴포넌트: 4단계 흐름을 state로 관리
// ─────────────────────────────────────────────────────────
export default function Dashboard() {
  const [storeName, setStoreName] = useState("");
  const [candidates, setCandidates] = useState(null);
  const [selectedStore, setSelectedStore] = useState(null);
  const [competitors, setCompetitors] = useState(null);
  const [selectedCompetitor, setSelectedCompetitor] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [region, setRegion] = useState("");
  const [regionAttempts, setRegionAttempts] = useState(0);
  const [candidateNote, setCandidateNote] = useState("");

  // 브라우저 뒤로가기/앞으로가기 지원: 화면이 바뀔 때마다 그 시점의 상태를 기록해두고,
  // popstate가 발생하면 기록해둔 상태로 그대로 복원한다. URL 자체는 바꾸지 않는다.
  const pushHistory = (snapshot) => {
    window.history.pushState(snapshot, "");
  };

  useEffect(() => {
    const onPopState = (event) => {
      const s = event.state;
      setStoreName(s?.storeName ?? "");
      setCandidates(s?.candidates ?? null);
      setSelectedStore(s?.selectedStore ?? null);
      setCompetitors(s?.competitors ?? null);
      setSelectedCompetitor(s?.selectedCompetitor ?? null);
      setRegion(s?.region ?? "");
      setRegionAttempts(s?.regionAttempts ?? 0);
      setCandidateNote(s?.candidateNote ?? "");
      setError(null);
      setLoading(false);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const handleSearch = async () => {
    const name = storeName.trim();
    if (!name || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/search-store`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ store_name: name, region: region.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "검색에 실패했습니다.");

      if (data.needs_region && regionAttempts < 3) {
        // 결과가 너무 많음 — 지역을 물어보고 SearchStep에 그대로 머무름(화면 전환 없음)
        const next = regionAttempts + 1;
        setRegionAttempts(next);
        pushHistory({
          storeName: name, region, regionAttempts: next, candidateNote: "",
          candidates: null, selectedStore: null, competitors: null, selectedCompetitor: null,
        });
        return;
      }

      // 충분히 좁혀졌거나(needs_region: false), 3회를 넘겨도 안 좁혀져서 안전장치로 그냥 진행
      const note = data.needs_region ? "그래도 결과가 많지만 우선 이 안에서 골라보세요." : "";
      const newCandidates = data.candidates.map((c, i) => ({ ...c, id: i }));
      setCandidates(newCandidates);
      setCandidateNote(note);
      setSelectedStore(null);
      setCompetitors(null);
      setSelectedCompetitor(null);
      setRegion("");
      setRegionAttempts(0);
      pushHistory({
        storeName: name, region: "", regionAttempts: 0, candidateNote: note,
        candidates: newCandidates, selectedStore: null, competitors: null, selectedCompetitor: null,
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCandidate = async (candidate) => {
    setSelectedStore(candidate);
    setSelectedCompetitor(null);
    setCompetitors(null);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/nearby-competitors`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: candidate.name,
          address: candidate.address,
          latitude: candidate.latitude,
          longitude: candidate.longitude,
          category: candidate.category,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "주변 가게 조회에 실패했습니다.");
      const newCompetitors = data.competitors.map((c) => ({ ...c, ...generateMockAnalysis() }));
      setCompetitors(newCompetitors);
      pushHistory({
        storeName, region, regionAttempts, candidateNote,
        candidates, selectedStore: candidate, competitors: newCompetitors, selectedCompetitor: null,
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCompetitor = (c) => {
    setSelectedCompetitor(c);
    pushHistory({
      storeName, region, regionAttempts, candidateNote,
      candidates, selectedStore, competitors, selectedCompetitor: c,
    });
  };

  const handleResearch = () => {
    setCandidates(null);
    setSelectedStore(null);
    setCompetitors(null);
    setSelectedCompetitor(null);
    setStoreName("");
    setError(null);
    setRegion("");
    setRegionAttempts(0);
    setCandidateNote("");
    pushHistory({
      storeName: "", region: "", regionAttempts: 0, candidateNote: "",
      candidates: null, selectedStore: null, competitors: null, selectedCompetitor: null,
    });
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: BG_PAGE, color: TEXT_PRIMARY, fontFamily: "'Pretendard', -apple-system, sans-serif" }}>
      <style>{`@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css');`}</style>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "48px 24px" }}>
        {!candidates && (
          <SearchStep
            storeName={storeName} setStoreName={setStoreName}
            region={region} setRegion={setRegion} regionAttempts={regionAttempts}
            onSearch={handleSearch} onResearch={handleResearch} loading={loading} error={error}
          />
        )}

        {candidates && !selectedStore && (
          <CandidateList
            storeName={storeName}
            candidates={candidates}
            note={candidateNote}
            onSelect={handleSelectCandidate}
            onResearch={handleResearch}
          />
        )}

        {selectedStore && !selectedCompetitor && (
          <div style={{ marginTop: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <button onClick={() => window.history.back()}
                style={{ background: "none", border: "none", color: GREEN, fontSize: 13, cursor: "pointer", padding: 0 }}>
                ‹ 이전으로 돌아가기
              </button>
              <button onClick={handleResearch}
                style={{ background: "none", border: "none", color: GREEN, fontSize: 13, cursor: "pointer", padding: 0 }}>
                처음으로 돌아가기
              </button>
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px" }}>{selectedStore.name}</h2>
            <p style={{ fontSize: 12, color: TEXT_SECONDARY, margin: "0 0 20px" }}>{selectedStore.address}</p>

            <SummaryInsight />

            {loading && (
              <p style={{ fontSize: 13, color: TEXT_MUTED, textAlign: "center", padding: "20px 0" }}>불러오는 중...</p>
            )}
            {error && (
              <p style={{ fontSize: 13, color: RED, marginBottom: 12 }}>{error}</p>
            )}
            {!loading && !error && competitors && (
              <>
                <p style={{ fontSize: 12, color: TEXT_MUTED, margin: "0 0 12px" }}>
                  반경 2km 내 가게 {competitors.length}곳
                </p>
                {competitors.length === 0 ? (
                  <p style={{ fontSize: 13, color: TEXT_MUTED, textAlign: "center", padding: "20px 0" }}>
                    반경 2km 내 가게가 없습니다.
                  </p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {competitors.map((c) => (
                      <CompetitorCard key={c.id} competitor={c} onClick={() => handleSelectCompetitor(c)} />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {selectedCompetitor && (
          <DetailView competitor={selectedCompetitor} onHome={handleResearch} />
        )}
      </div>
      <ScrollToTopButton />
    </div>
  );
}
