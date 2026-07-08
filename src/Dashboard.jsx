// Dashboard.jsx — 네이버 그린 · 라이트 · 미니멀 스타일
// Tailwind CSS 세팅된 React 프로젝트에서 그대로 교체 사용
import { useState } from "react";

const API_BASE = "http://localhost:3000";
const GREEN = "#03C75A";
const GREEN_DARK = "#00A344";

// 긍정 비율 도넛 게이지
function SentimentDonut({ positive, negative }) {
  const total = positive + negative || 1;
  const ratio = positive / total;
  const R = 52;
  const C = 2 * Math.PI * R;
  return (
    <div className="relative mx-auto h-40 w-40">
      <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90">
        <circle cx="64" cy="64" r={R} fill="none" stroke="#F1F3F5" strokeWidth="13" />
        <circle
          cx="64" cy="64" r={R} fill="none"
          stroke={GREEN} strokeWidth="13" strokeLinecap="round"
          strokeDasharray={`${C * ratio} ${C}`}
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-gray-900">
          {Math.round(ratio * 100)}%
        </span>
        <span className="mt-0.5 text-xs font-semibold" style={{ color: GREEN_DARK }}>
          긍정 리뷰
        </span>
      </div>
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
    <div className="min-h-screen bg-[#F5F6F8] text-gray-900">
      <style>{`
        @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css');
        body, .font-pretendard { font-family: 'Pretendard', -apple-system, 'Noto Sans KR', sans-serif; }
        @media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
      `}</style>

      <div className="font-pretendard mx-auto max-w-3xl px-6 py-16">
        {/* ── 인트로 헤더 (중앙 정렬) ── */}
        <header className="rounded-3xl bg-white px-8 py-12 text-center shadow-sm">
          <p
            className="text-xs font-bold tracking-[0.25em]"
            style={{ color: GREEN_DARK }}
          >
            AI MYSTERY SHOPPER
          </p>
          <h1 className="mt-4 text-3xl font-bold leading-snug sm:text-4xl">
            소상공인을 위한
            <br />
            경쟁업체 리뷰 분석 AI 에이전트
          </h1>
          <p className="mx-auto mt-5 max-w-md leading-7 text-gray-600">
            바쁜 사장님을 대신해 경쟁 가게의 리뷰를 수집·분석하고, 우리 가게가
            취할 전략까지 제안하는 마케팅 파트너입니다.
          </p>

          {/* 검색 */}
          <div className="mx-auto mt-8 flex max-w-md gap-2">
            <input
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
              placeholder="분석할 경쟁업체 이름 (예: 보노베리)"
              className="flex-1 rounded-xl border border-gray-200 bg-[#F8F9FA] px-4 py-3.5 text-sm outline-none transition placeholder:text-gray-400 focus:border-[#03C75A] focus:bg-white"
            />
            <button
              onClick={handleAnalyze}
              disabled={loading || !storeName.trim()}
              className="rounded-xl px-6 py-3.5 text-sm font-bold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-40"
              style={{ backgroundColor: GREEN }}
            >
              {loading ? "분석 중..." : "분석 시작"}
            </button>
          </div>
          {error && (
            <p className="mx-auto mt-4 max-w-md rounded-xl bg-red-50 px-4 py-3 text-sm text-red-500">
              {error} — 백엔드 서버(8000번 포트) 실행 여부를 확인하세요.
            </p>
          )}

          {/* 초기 상태: 기능 소개 (좌측 그린 바) */}
          {!data && !loading && (
            <div className="mx-auto mt-10 max-w-md space-y-6 text-left">
              {[
                ["리뷰 감성 분석", "리뷰 하나하나를 긍정·부정으로 자동 분류해요."],
                ["키워드 순위", "손님들이 자주 말하는 포인트를 순위로 보여줘요."],
                ["AI 전략 리포트", "벤치마킹할 강점과 공략할 약점을 정리해줘요."],
              ].map(([title, desc]) => (
                <div
                  key={title}
                  className="border-l-4 pl-5 text-center sm:text-left"
                  style={{ borderColor: GREEN }}
                >
                  <p className="font-bold">{title}</p>
                  <p className="mt-1 text-sm text-gray-500">{desc}</p>
                </div>
              ))}
            </div>
          )}

          {loading && (
            <p className="mt-8 text-sm text-gray-500">
              Gemini가 리뷰 5건을 분석하고 있습니다...
            </p>
          )}
        </header>

        {data && !loading && (
          <main className="mt-6 space-y-6">
            {/* ── 감성 분석 결과 ── */}
            <section className="rounded-3xl bg-white p-8 text-center shadow-sm">
              <p
                className="text-xs font-bold tracking-[0.2em]"
                style={{ color: GREEN_DARK }}
              >
                SENTIMENT
              </p>
              <h2 className="mt-2 text-xl font-bold">
                &lsquo;{data.store_name}&rsquo; 리뷰 감성 분석
              </h2>
              <div className="mt-6">
                <SentimentDonut positive={data.positive} negative={data.negative} />
              </div>
              <div className="mx-auto mt-6 grid max-w-sm grid-cols-3 gap-3">
                {[
                  ["총 리뷰", `${data.total_reviews}건`, "text-gray-900"],
                  ["긍정", `${data.positive}건`, "text-[#00A344]"],
                  ["부정", `${data.negative}건`, "text-red-500"],
                ].map(([label, value, color]) => (
                  <div key={label} className="rounded-2xl bg-[#F8F9FA] py-4">
                    <p className="text-xs text-gray-500">{label}</p>
                    <p className={`mt-1 text-lg font-bold ${color}`}>{value}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* ── AI 전략 리포트 (민트 박스) ── */}
            <section className="rounded-3xl bg-[#E9F9F0] p-8 text-center">
              <p
                className="text-sm font-bold"
                style={{ color: GREEN_DARK }}
              >
                AI 전략 리포트
              </p>
              <p className="mx-auto mt-4 max-w-xl whitespace-pre-line text-left leading-8 text-gray-700 sm:text-center">
                {data.consulting_report}
              </p>
            </section>

            {/* ── 키워드 순위 ── */}
            <section className="rounded-3xl bg-white p-8 shadow-sm">
              <div className="text-center">
                <p
                  className="text-xs font-bold tracking-[0.2em]"
                  style={{ color: GREEN_DARK }}
                >
                  KEYWORDS
                </p>
                <h2 className="mt-2 text-xl font-bold">언급 키워드 순위</h2>
              </div>
              <ul className="mx-auto mt-6 max-w-md space-y-4">
                {data.keyword_ranking.map((k, i) => (
                  <li key={k.keyword}>
                    <div className="mb-1.5 flex items-center justify-between text-sm">
                      <span className="font-semibold">
                        <span className="mr-2 text-gray-400">{i + 1}</span>
                        {k.keyword}
                      </span>
                      <span className="text-gray-400">{k.count}회</span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-[#F1F3F5]">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${(k.count / maxKeyword) * 100}%`,
                          backgroundColor: GREEN,
                        }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            {/* ── 리뷰 목록 ── */}
            <section className="rounded-3xl bg-white p-8 shadow-sm">
              <div className="text-center">
                <p
                  className="text-xs font-bold tracking-[0.2em]"
                  style={{ color: GREEN_DARK }}
                >
                  REVIEWS
                </p>
                <h2 className="mt-2 text-xl font-bold">분석된 리뷰</h2>
              </div>
              <ul className="mt-6 space-y-4">
                {data.reviews.map((r, i) => (
                  <li key={i} className="rounded-2xl bg-[#F8F9FA] p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          r.sentiment === "긍정"
                            ? "bg-[#E9F9F0] text-[#00A344]"
                            : "bg-red-50 text-red-500"
                        }`}
                      >
                        {r.sentiment}
                      </span>
                      {r.keywords?.map((k) => (
                        <span
                          key={k}
                          className="rounded-full bg-white px-3 py-1 text-xs text-gray-500"
                        >
                          #{k}
                        </span>
                      ))}
                    </div>
                    <p className="mt-3 text-sm leading-7 text-gray-700">
                      {r.content}
                    </p>
                    <p className="mt-2 text-xs text-gray-400">요약 · {r.summary}</p>
                  </li>
                ))}
              </ul>
            </section>
          </main>
        )}

        <footer className="py-10 text-center text-xs text-gray-400">
          AI Mystery Shopper · FastAPI + React + Gemini
        </footer>
      </div>
    </div>
  );
}
