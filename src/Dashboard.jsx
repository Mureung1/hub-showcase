// Dashboard.jsx — 다크 대시보드 레이아웃 · 네이버 그린 포인트
// 참고 디자인의 카드 배치·큰 숫자 강조·다크 배경 구조를 가져오고
// 포인트 컬러는 네이버 그린(#03C75A)으로 유지
import { useState } from "react";

const API_BASE = import.meta.env.PROD ? "" : "http://localhost:8000";

const GREEN = "#03C75A";
const GREEN_DARK = "#00A344";
const BG_PAGE = "#0D0F0E";
const BG_CARD = "#1A1D1B";
const BG_CARD_ALT = "#16181A";
const BG_REPORT = "#12241A";
const BORDER_REPORT = "#1E3A2A";
const BORDER_DIVIDER = "#2A2E2B";
const TEXT_SECONDARY = "#9CA3AF";
const TEXT_MUTED = "#6B7280";
const RED = "#E24B4A";

// 긍정 비율 도넛 게이지
function SentimentDonut({ positive, negative }) {
  const total = positive + negative || 1;
  const ratio = positive / total;
  const R = 52;
  const C = 2 * Math.PI * R;
  return (
    <div className="relative mx-auto h-28 w-28 shrink-0">
      <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90">
        <circle cx="64" cy="64" r={R} fill="none" stroke={BORDER_DIVIDER} strokeWidth="13" />
        <circle
          cx="64" cy="64" r={R} fill="none"
          stroke={GREEN} strokeWidth="13" strokeLinecap="round"
          strokeDasharray={`${C * ratio} ${C}`}
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold text-white">{Math.round(ratio * 100)}%</span>
      </div>
    </div>
  );
}

// 통계 카드 (숫자 강조)
function StatCard({ label, value, color }) {
  return (
    <div className="rounded-2xl p-4" style={{ backgroundColor: BG_CARD }}>
      <p className="text-xs" style={{ color: TEXT_SECONDARY }}>{label}</p>
      <p className="mt-2 text-2xl font-bold" style={{ color: color || "#fff" }}>{value}</p>
    </div>
  );
}

export default function Dashboard() {
  const [storeName, setStoreName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const handleAnalyze = async () => {
    if (!storeName.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ store_name: storeName.trim() }),
      });
      if (!res.ok) throw new Error(`분석 요청 실패 (${res.status})`);
      setData(await res.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const maxKeyword = data?.keyword_ranking?.[0]?.count || 1;

  return (
    <div className="min-h-screen text-white" style={{ backgroundColor: BG_PAGE }}>
      <style>{`
        @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css');
        body, .font-pretendard { font-family: 'Pretendard', -apple-system, 'Noto Sans KR', sans-serif; }
        @media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
      `}</style>

      <div className="font-pretendard mx-auto max-w-3xl px-6 py-16">
        {/* ── 헤더 / 검색 ── */}
        <header className="rounded-3xl px-8 py-10" style={{ backgroundColor: BG_CARD_ALT }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold tracking-[0.2em]" style={{ color: GREEN }}>
                AI MYSTERY SHOPPER
              </p>
              <h1 className="mt-2 text-2xl font-bold">
                소상공인을 위한 경쟁업체 리뷰 분석
              </h1>
              <p className="mt-2 max-w-md text-sm leading-6" style={{ color: TEXT_SECONDARY }}>
                경쟁 가게의 리뷰를 수집·분석하고, 우리 가게가 취할 전략을 제안합니다.
              </p>
            </div>
          </div>

          <div className="mt-6 flex gap-2">
            <input
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
              placeholder="분석할 경쟁업체 이름 (예: 보노베리)"
              className="flex-1 rounded-xl border px-4 py-3 text-sm text-white outline-none placeholder:text-gray-500"
              style={{ backgroundColor: BG_CARD, borderColor: BORDER_DIVIDER }}
            />
            <button
              onClick={handleAnalyze}
              disabled={loading || !storeName.trim()}
              className="rounded-full px-6 py-3 text-sm font-bold transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-40"
              style={{ backgroundColor: GREEN, color: "#04342C" }}
            >
              {loading ? "분석 중..." : "분석 시작"}
            </button>
          </div>

          {error && (
            <p className="mt-4 rounded-xl px-4 py-3 text-sm" style={{ backgroundColor: "#2A1414", color: "#F09595" }}>
              {error} — 백엔드 서버 실행 여부를 확인하세요.
            </p>
          )}

          {loading && (
            <p className="mt-6 text-sm" style={{ color: TEXT_SECONDARY }}>
              Gemini가 리뷰를 분석하고 있습니다...
            </p>
          )}
        </header>

        {data && !loading && (
          <main className="mt-4 space-y-4">
            {/* ── 통계 카드 4개 ── */}
            <div className="grid grid-cols-4 gap-3">
              <StatCard label="총 리뷰" value={`${data.total_reviews}건`} />
              <StatCard label="긍정" value={`${data.positive}건`} color={GREEN} />
              <StatCard label="부정" value={`${data.negative}건`} color={RED} />
              <StatCard label="긍정 비율" value={`${data.positive_ratio}%`} />
            </div>

            {/* ── 감성 도넛 + 키워드 순위 (나란히) ── */}
            <div className="grid grid-cols-[1.2fr_1fr] gap-3">
              <div className="flex items-center gap-6 rounded-2xl p-5" style={{ backgroundColor: BG_CARD }}>
                <SentimentDonut positive={data.positive} negative={data.negative} />
                <div>
                  <p className="text-xs" style={{ color: TEXT_SECONDARY }}>감성 분석</p>
                  <p className="mt-1.5 text-sm leading-6 text-gray-200">
                    '{data.store_name}' 리뷰 {data.total_reviews}건 중<br />
                    긍정 {data.positive}건 / 부정 {data.negative}건
                  </p>
                </div>
              </div>

              <div className="rounded-2xl p-5" style={{ backgroundColor: BG_CARD }}>
                <p className="mb-3 text-xs" style={{ color: TEXT_SECONDARY }}>키워드 순위</p>
                <div className="flex flex-col gap-2.5">
                  {data.keyword_ranking.slice(0, 4).map((k) => (
                    <div key={k.keyword}>
                      <div className="mb-1 flex justify-between text-xs">
                        <span>{k.keyword}</span>
                        <span style={{ color: TEXT_MUTED }}>{k.count}회</span>
                      </div>
                      <div className="h-1.5 rounded-full" style={{ backgroundColor: BORDER_DIVIDER }}>
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${(k.count / maxKeyword) * 100}%`, backgroundColor: GREEN }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── AI 전략 리포트 ── */}
            <div className="rounded-2xl border p-5" style={{ backgroundColor: BG_REPORT, borderColor: BORDER_REPORT }}>
              <p className="mb-2 text-xs font-bold" style={{ color: GREEN }}>AI 전략 리포트</p>
              <p className="whitespace-pre-line text-sm leading-7 text-gray-200">
                {data.consulting_report}
              </p>
            </div>

            {/* ── 리뷰 목록 ── */}
            <div className="rounded-2xl p-5" style={{ backgroundColor: BG_CARD }}>
              <p className="mb-3 text-xs" style={{ color: TEXT_SECONDARY }}>분석된 리뷰</p>
              <ul className="space-y-3">
                {data.reviews.map((r, i) => (
                  <li key={i} className="rounded-xl p-4" style={{ backgroundColor: BG_CARD_ALT }}>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className="rounded-full px-2.5 py-1 text-xs font-bold"
                        style={
                          r.sentiment === "긍정"
                            ? { backgroundColor: "#12241A", color: GREEN }
                            : { backgroundColor: "#2A1414", color: "#F09595" }
                        }
                      >
                        {r.sentiment}
                      </span>
                      {r.keywords?.map((k) => (
                        <span
                          key={k}
                          className="rounded-full px-2.5 py-1 text-xs"
                          style={{ backgroundColor: BORDER_DIVIDER, color: TEXT_SECONDARY }}
                        >
                          #{k}
                        </span>
                      ))}
                    </div>
                    <p className="mt-2.5 text-sm leading-6 text-gray-300">{r.content}</p>
                    <p className="mt-1.5 text-xs" style={{ color: TEXT_MUTED }}>요약 · {r.summary}</p>
                  </li>
                ))}
              </ul>
            </div>
          </main>
        )}

        <footer className="py-10 text-center text-xs" style={{ color: TEXT_MUTED }}>
          AI Mystery Shopper · FastAPI + React + Gemini
        </footer>
      </div>
    </div>
  );
}
