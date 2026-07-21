"use client";
import { useApp } from "@/lib/client/store";
import { AXES, getSituation, totalOf } from "@/lib/domain/situations";
import { BADGES, computeStreak, unlockedBadges } from "@/lib/domain/gamification";

export default function Trajectory() {
  const app = useApp();
  const history = app.history;
  const totals = history.map((h) => totalOf(h.scores));
  const avg = totals.length ? Math.round(totals.reduce((a, b) => a + b, 0) / totals.length) : 0;
  const best = totals.length ? Math.max(...totals) : 0;
  const lastTotal = totals.length ? totals[totals.length - 1] : 0;
  const streak = computeStreak(history);
  const unlocked = unlockedBadges({ history, assets: app.assets });
  const unlockedIds = new Set(unlocked.map((b) => b.id));

  return (
    <div>
      <h1 className="mb-1 text-2xl font-extrabold">궤적</h1>
      <p className="mb-5 text-[13.5px]" style={{ color: "var(--sub)" }}>훈련의 흐름과 잘 쓴 순간들.</p>

      {/* 요약 통계 */}
      <div className="mb-5 grid grid-cols-2 gap-2.5 sm:grid-cols-5">
        <Stat label="총 세션" value={`${history.length}회`} />
        <Stat label="평균 총점" value={`${avg}점`} />
        <Stat label="최고 총점" value={`${best}점`} />
        <Stat label="최근 총점" value={`${lastTotal}점`} />
        <Stat label="연속 기록" value={`${streak.current}일`} />
      </div>

      {/* 배지 */}
      <div className="mb-3 text-[13px] font-bold" style={{ color: "var(--sub)" }}>배지 ({unlocked.length}/{BADGES.length})</div>
      <div className="mb-6 grid grid-cols-3 gap-2.5 sm:grid-cols-5">
        {BADGES.map((b) => {
          const on = unlockedIds.has(b.id);
          return (
            <div
              key={b.id}
              title={b.desc}
              className="flex flex-col items-center gap-1 rounded-xl border p-3 text-center"
              style={{ background: on ? "var(--accent-soft)" : "var(--surface)", borderColor: on ? "var(--accent)" : "var(--line)", opacity: on ? 1 : 0.5 }}
            >
              <span className="text-xl">{on ? b.icon : "🔒"}</span>
              <span className="text-[11px] font-bold" style={{ color: on ? "var(--accent)" : "var(--sub)" }}>{b.label}</span>
            </div>
          );
        })}
      </div>

      {/* 세션 로그 */}
      <div className="mb-3 text-[13px] font-bold" style={{ color: "var(--sub)" }}>세션 기록</div>
      {history.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-9 text-center text-[13.5px]" style={{ borderColor: "var(--line)", color: "var(--sub)" }}>
          아직 기록이 없어요. 훈련을 마치면 여기에 쌓입니다.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {history
            .slice()
            .reverse()
            .map((h, i) => {
              const sit = getSituation(h.sid, app.customSits);
              const tot = totalOf(h.scores);
              const color = tot >= 80 ? "var(--good)" : tot >= 55 ? "var(--warn)" : "var(--bad)";
              return (
                <div key={i} className="flex items-center gap-3 rounded-xl border p-3.5" style={{ background: "var(--surface)", borderColor: "var(--line)" }}>
                  <span className="text-[11px]" style={{ color: "var(--sub)", minWidth: 34 }}>{h.d}</span>
                  <span className="flex-1 truncate text-[13.5px] font-semibold">{sit?.title || h.sid}</span>
                  <span className="flex gap-1">
                    {AXES.map((ax) => (
                      <span key={ax.key} className="rounded px-1.5 py-0.5 text-[10.5px] font-bold" style={{ background: "var(--bg)", color: "var(--sub)" }}>
                        {ax.num}{h.scores[ax.key]}
                      </span>
                    ))}
                  </span>
                  <span className="text-[13px] font-extrabold" style={{ color }}>{tot}</span>
                </div>
              );
            })}
        </div>
      )}

      {/* 잘 쓴 순간 */}
      {app.assets.length > 0 && (
        <>
          <div className="mb-3 mt-6 text-[13px] font-bold" style={{ color: "var(--sub)" }}>잘 쓴 순간</div>
          <div className="flex flex-col gap-2">
            {app.assets
              .slice()
              .reverse()
              .map((a) => {
                const sit = getSituation(a.sid, app.customSits);
                return (
                  <div key={a.id} className="rounded-xl border p-3.5" style={{ background: "var(--surface)", borderColor: "var(--line)" }}>
                    <div className="text-[13.5px]" style={{ color: "var(--ink)", lineHeight: 1.6 }}>{a.text}</div>
                    <div className="mt-1.5 text-[11px]" style={{ color: "var(--sub)" }}>{sit?.title || a.sid} · {a.date}</div>
                  </div>
                );
              })}
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border p-3.5" style={{ background: "var(--surface)", borderColor: "var(--line)" }}>
      <div className="text-[11.5px]" style={{ color: "var(--sub)" }}>{label}</div>
      <div className="mt-0.5 text-lg font-extrabold">{value}</div>
    </div>
  );
}
