"use client";
import { useApp } from "@/lib/client/store";
import { NEWS_CATEGORIES } from "@/lib/domain/news-categories";
import { newsSid, totalOf } from "@/lib/domain/situations";
import { XP_NEW_SITUATION } from "@/lib/domain/gamification";
import type { ScreenKey } from "@/components/AppShell";
import ProfileChip from "@/components/stitch/ProfileChip";

// 카드 색은 분야마다 다르게 — 목록이 짧아 한눈에 구분되는 편이 낫다.
const STYLE: Record<string, { icon: string; fg: string; bg: string }> = {
  market: { icon: "trending_up", fg: "#4648d4", bg: "#E0E7FF" },
  tech: { icon: "memory", fg: "#0284C7", bg: "#E0F2FE" },
  sports: { icon: "sports_soccer", fg: "#EA580C", bg: "#FFEDD5" },
  culture: { icon: "palette", fg: "#9333EA", bg: "#F3E8FF" },
  society: { icon: "groups", fg: "#D97706", bg: "#FEF3C7" },
};

export default function NewsPicker({ nav, onPick }: { nav: (k: ScreenKey) => void; onPick: (cat: string) => void }) {
  const app = useApp();

  // 분야별 실적 — 기사는 매번 새로 받아오므로 "새 기사 n개" 같은 건 셀 수 없다. 내 기록만 보여준다.
  const stat = (key: string) => {
    const rows = app.history.filter((h) => h.sid === newsSid(key));
    const n = rows.length;
    return { n, avg: n ? Math.round(rows.reduce((a, h) => a + totalOf(h.scores), 0) / n) : 0 };
  };

  return (
    <div className="bg-background text-on-background min-h-screen font-body-md overflow-x-hidden">
      <header className="fixed top-0 w-full z-40 flex justify-between items-center px-4 md:px-8 h-16 bg-surface-container-lowest/80 backdrop-blur-md border-b border-border-light">
        <div className="flex items-center gap-4">
          <button onClick={() => nav("training")} className="p-2 rounded-full hover:bg-surface-container-low transition-colors group flex items-center justify-center text-on-surface-variant">
            <span className="material-symbols-outlined group-hover:-translate-x-1 transition-transform">arrow_back</span>
          </button>
          <h1 className="font-headline-md text-headline-md text-primary">뉴스 분야 선택</h1>
        </div>
        <div className="flex items-center gap-2">
          <ProfileChip name={app.profile?.name || app.profile?.role} />
        </div>
      </header>

      <main className="pt-24 pb-12 px-4 md:px-8 max-w-6xl mx-auto flex flex-col gap-stack-lg">
        <section className="flex flex-col gap-stack-sm items-center text-center mt-8 mb-4">
          <h2 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface">오늘 요약해볼 뉴스 분야를 골라주세요.</h2>
          <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl mt-2">
            고른 분야의 실제 최신 기사를 가져와 요약 훈련을 시작합니다. 처음 해보는 분야는 XP를 더 받아요.
          </p>
        </section>

        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-gutter-grid">
          {NEWS_CATEGORIES.map((c) => {
            const s = stat(c.key);
            const st = STYLE[c.key];
            return (
              <button
                key={c.key}
                onClick={() => onPick(c.key)}
                className="relative text-left bg-surface-container-lowest rounded-xl p-6 border border-border-light shadow-card overflow-hidden group focus:outline-none focus:ring-2 focus:ring-primary transition-all duration-300 hover:-translate-y-1 hover:shadow-float"
              >
                <div className="flex justify-between items-start mb-6">
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform" style={{ background: st.bg }}>
                    <span className="material-symbols-outlined text-[28px]" style={{ color: st.fg, fontVariationSettings: "'FILL' 1" }}>{st.icon}</span>
                  </div>
                  {s.n === 0 && (
                    <div className="flex items-center gap-1 bg-tertiary-container/10 text-tertiary px-2.5 py-1 rounded-full font-label-sm border border-tertiary/20">
                      <span className="material-symbols-outlined text-[16px]">bolt</span>
                      <span>+{XP_NEW_SITUATION} XP</span>
                    </div>
                  )}
                </div>
                <h3 className="font-headline-md text-headline-md text-on-surface mb-1 group-hover:text-primary transition-colors">{c.label}</h3>
                <span className="font-label-sm text-on-surface-variant">
                  {s.n === 0 ? "아직 안 해본 분야예요" : `${s.n}회 훈련 · 평균 ${s.avg}점`}
                </span>
              </button>
            );
          })}
        </section>
      </main>
    </div>
  );
}
