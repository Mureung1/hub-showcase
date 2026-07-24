"use client";
import { useApp } from "@/lib/client/store";
import { totalOf } from "@/lib/domain/situations";
import { BADGES, computeStreak, levelInfo, totalXP, unlockedBadges } from "@/lib/domain/gamification";
import DashboardLayout from "@/components/stitch/DashboardLayout";
import type { ScreenKey } from "@/components/AppShell";

export default function Stats({ nav }: { nav: (k: ScreenKey) => void }) {
  const app = useApp();
  const history = app.history;
  const lvl = levelInfo(totalXP(history));
  const streak = computeStreak(history);
  const unlocked = new Set(unlockedBadges({ history, assets: app.assets }).map((b) => b.id));
  const best = history.length ? Math.max(...history.map((h) => totalOf(h.scores))) : 0;

  // 활동 기록 히트맵 (최근 35일)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const heat = Array.from({ length: 35 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (34 - i));
    const next = d.getTime() + 86400000;
    return history.filter((h) => (h.ts ?? 0) >= d.getTime() && (h.ts ?? 0) < next).length;
  });
  const heatCls = (n: number) => (n === 0 ? "bg-surface-container-high" : n === 1 ? "bg-primary/30" : n === 2 ? "bg-primary/60" : "bg-primary");

  const nextBadges = BADGES.filter((b) => !unlocked.has(b.id)).slice(0, 3);

  return (
    <DashboardLayout active="stats" name={app.profile?.name || app.profile?.role} nav={nav}>
      <div className="flex flex-col lg:flex-row gap-gutter-grid">
        {/* 학습 여정 */}
        <section className="flex-[1.2] flex flex-col gap-stack-md">
          <div className="flex justify-between items-center mb-2">
            <h2 className="font-headline-md text-headline-md text-on-surface">학습 여정</h2>
            <span className="flex items-center gap-1 text-primary font-label-sm"><span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>stars</span> Lv. {lvl.level}</span>
          </div>

          {/* 레벨 카드 */}
          <div className="bg-white rounded-xl p-padding-card border border-border-light shadow-card">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 rounded-xl bg-primary text-white flex items-center justify-center shadow-card"><span className="font-display-lg text-3xl font-bold">{lvl.level}</span></div>
              <div className="flex-1">
                <div className="flex justify-between font-label-sm text-on-surface-variant mb-1"><span>Lv. {lvl.level}</span><span>{lvl.xpIntoLevel} / {lvl.xpForNext} XP</span></div>
                <div className="w-full bg-surface-container-high rounded-full h-2.5 overflow-hidden"><div className="h-full bg-primary rounded-full" style={{ width: `${lvl.progress * 100}%` }} /></div>
                <p className="text-xs text-on-surface-variant mt-2">🔥 연속 {streak.current}일 · 최고 총점 {best}점</p>
              </div>
            </div>
          </div>

          {/* 활동 기록 히트맵 */}
          <div className="bg-white rounded-xl p-padding-card border border-border-light shadow-card">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-body-lg font-semibold text-on-surface">활동 기록</h3>
              <span className="font-label-sm text-outline">최근 5주</span>
            </div>
            {/* aspect-square를 카드 폭에 그대로 맡기면 칸이 100px짜리 블록이 된다. 폭을 묶어둔다. */}
            <div className="grid grid-cols-7 gap-1.5 max-w-[280px]">
              {heat.map((n, i) => <div key={i} className={"aspect-square rounded-[4px] " + heatCls(n)} title={`${n}회`} />)}
            </div>
            <div className="flex items-center gap-1.5 mt-3 text-outline font-label-sm max-w-[280px] justify-end">
              <span>적음</span>
              {["bg-surface-container-high", "bg-primary/30", "bg-primary/60", "bg-primary"].map((c) => <div key={c} className={"w-3 h-3 rounded-[3px] " + c} />)}
              <span>많음</span>
            </div>
          </div>
        </section>

        {/* 보상 + 배지 */}
        <section className="flex-[1.5] flex flex-col gap-stack-md">
          <div className="flex justify-between items-center mb-2">
            <h2 className="font-headline-md text-headline-md text-on-surface">캐릭터 스탯</h2>
            <span className="font-label-sm text-outline">{unlocked.size} / {BADGES.length} 획득</span>
          </div>

          {/* 다음 목표 보상 */}
          <div className="bg-white rounded-xl p-padding-card border border-border-light shadow-card">
            <h3 className="font-body-lg font-semibold text-on-surface mb-4">다음 배지</h3>
            <div className="space-y-3">
              {nextBadges.map((b) => (
                <div key={b.id} className="flex items-center gap-4 p-3 rounded-xl bg-surface border border-border-light">
                  <div className="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center text-xl grayscale opacity-70">{b.icon}</div>
                  <div className="flex-1"><h4 className="font-medium text-on-surface text-sm">{b.label}</h4><p className="text-xs text-on-surface-variant">{b.desc}</p></div>
                  <span className="material-symbols-outlined text-outline">lock</span>
                </div>
              ))}
              {nextBadges.length === 0 && <p className="text-sm text-on-surface-variant text-center py-2">모든 배지를 획득했어요! 🎉</p>}
            </div>
          </div>

          {/* 배지 그리드 */}
          <div className="bg-white rounded-xl p-padding-card border border-border-light shadow-card flex-1">
            <h3 className="font-body-lg font-semibold text-on-surface mb-4">획득한 배지</h3>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
              {BADGES.map((b) => {
                const on = unlocked.has(b.id);
                return (
                  <div key={b.id} title={b.desc} className={"flex flex-col items-center gap-1.5 rounded-xl p-3 border text-center " + (on ? "bg-chat-bg-user border-primary/30" : "bg-surface border-border-light opacity-60")}>
                    <span className="text-2xl">{on ? b.icon : "🔒"}</span>
                    <span className={"font-bold " + (on ? "text-primary" : "text-on-surface-variant")}>{b.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}
