"use client";
import { useApp } from "@/lib/client/store";
import { AXES, LEVELS, SITUATIONS } from "@/lib/domain/situations";
import type { Situation } from "@/lib/domain/types";

export default function Home({ onPick, startSit }: { onPick: () => void; startSit: (s: Situation) => void }) {
  const app = useApp();
  const history = app.history;
  const last = history[history.length - 1];
  const first = history[0];

  // 약점 축 → 추천 상황
  const weak = last
    ? AXES.reduce((w, ax) => (last.scores[ax.key] < last.scores[w.key] ? ax : w), AXES[0])
    : AXES[0];
  const mine = SITUATIONS.filter((s) => !s.ctx && (!app.profile?.role || s.roles?.includes(app.profile.role)));
  const reco = mine.find((s) => s.axis.startsWith(weak.num)) || mine[0] || SITUATIONS[0];

  return (
    <div>
      <h1 className="text-2xl font-extrabold leading-snug">오늘도 훈련하러 오셨네요</h1>
      <p className="mb-5 mt-1 text-[13.5px]" style={{ color: "var(--sub)" }}>
        화용 점수는 &apos;한 번의 잘 쓴 글&apos;이 아니라 궤적으로 오릅니다.
      </p>

      {/* 축별 현황 */}
      <div className="mb-4 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        {AXES.map((ax) => {
          const cur = last ? last.scores[ax.key] : null;
          const delta = cur != null && first ? cur - first.scores[ax.key] : 0;
          return (
            <div key={ax.key} className="rounded-2xl border p-4" style={{ background: "var(--surface)", borderColor: "var(--line)" }}>
              <div className="flex items-center justify-between">
                <span className="text-[14px] font-bold">{ax.num} {ax.name}</span>
                <span className="text-[12px]" style={{ color: "var(--sub)" }}>
                  {cur ? `${LEVELS[cur].label} ${cur}/3` : "기록 없음"}
                </span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full" style={{ background: "var(--bg)" }}>
                <div className="h-full rounded-full" style={{ width: `${((cur || 0) / 3) * 100}%`, background: "var(--accent)" }} />
              </div>
              {cur != null && (
                <div className="mt-1.5 text-[11.5px]" style={{ color: "var(--sub)" }}>
                  {delta > 0 ? `첫 세션 대비 +${delta}` : delta < 0 ? `첫 세션 대비 ${delta}` : "유지 중"}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 추천 훈련 */}
      <button
        onClick={() => startSit(reco)}
        className="w-full rounded-2xl border p-5 text-left"
        style={{ background: "var(--side)", borderColor: "var(--side)" }}
      >
        <div className="text-[12px] font-bold" style={{ color: "var(--side-dim)" }}>오늘의 추천 훈련</div>
        <div className="mt-1 text-lg font-extrabold" style={{ color: "#fff" }}>{reco.title}</div>
        <div className="mt-1 text-[13px]" style={{ color: "var(--side-ink)" }}>
          {last ? `최근 세션에서 '${weak.name}' 축이 낮았어요. 이 상황이 그 축을 훈련합니다.` : `${app.profile?.role || "당신"}이 자주 겪는 상황부터 시작해볼게요.`}
        </div>
      </button>

      <button onClick={onPick} className="mt-3 w-full rounded-xl border py-3 text-[13.5px] font-semibold" style={{ background: "var(--surface)", borderColor: "var(--line)", color: "var(--accent)" }}>
        모든 상황 둘러보기 →
      </button>
    </div>
  );
}
