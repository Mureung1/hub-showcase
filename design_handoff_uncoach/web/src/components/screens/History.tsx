"use client";
import { useMemo, useState } from "react";
import { useApp } from "@/lib/client/store";
import { getSituation, totalOf, modeOf, MODE_LABEL } from "@/lib/domain/situations";
import { DEMO_SITS } from "@/lib/domain/demo-sits";
import DashboardLayout from "@/components/stitch/DashboardLayout";
import type { ScreenKey } from "@/components/AppShell";

const WEEK = ["일", "월", "화", "수", "목", "금", "토"];

function grade(t: number) {
  if (t >= 95) return "A+";
  if (t >= 90) return "A";
  if (t >= 85) return "B+";
  if (t >= 80) return "B";
  if (t >= 70) return "C+";
  if (t >= 60) return "C";
  return t > 0 ? "D" : "-";
}

export default function History({ nav }: { nav: (k: ScreenKey) => void }) {
  const app = useApp();
  const history = app.history;
  const hasHistory = history.length > 0;

  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const [selected, setSelected] = useState<number | null>(new Date().getDate());
  const [period, setPeriod] = useState<"week" | "month">("month");

  const byDay = useMemo(() => {
    const map = new Map<number, typeof history>();
    for (const h of history) {
      const d = new Date(h.ts ?? 0);
      if (h.ts && d.getFullYear() === cursor.y && d.getMonth() === cursor.m) {
        const day = d.getDate();
        map.set(day, [...(map.get(day) || []), h]);
      }
    }
    return map;
  }, [history, cursor]);

  const firstDow = new Date(cursor.y, cursor.m, 1).getDay();
  const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(firstDow).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  const shift = (delta: number) => {
    setSelected(null);
    setCursor((c) => {
      const m = c.m + delta;
      return { y: c.y + Math.floor(m / 12), m: ((m % 12) + 12) % 12 };
    });
  };

  // 학습 통계 기간 — 주간(최근 7일) / 월간(최근 30일)
  const since = Date.now() - (period === "week" ? 7 : 30) * 86400000;
  const inPeriod = history.filter((h) => (h.ts ?? 0) >= since);
  const totals = inPeriod.map((h) => totalOf(h.scores));
  const avg = totals.length ? Math.round(totals.reduce((a, b) => a + b, 0) / totals.length) : 0;
  // 세션당 약 15분으로 환산
  const minutes = inPeriod.length * 15;
  const studyTime = minutes >= 60 ? `약 ${Math.round((minutes / 60) * 10) / 10}시간` : `약 ${minutes}분`;
  // 숙련도 등급색은 피드백 화면(적절/무난/위험)과 같은 기준을 쓴다.
  const tone = !inPeriod.length
    ? { text: "text-outline", bar: "bg-outline-variant" }
    : avg >= 80
    ? { text: "text-tertiary", bar: "bg-tertiary" }
    : avg >= 50
    ? { text: "text-progress-orange", bar: "bg-progress-orange" }
    : { text: "text-error", bar: "bg-error" };

  // 성장 궤적 (최근 6개월 평균 → A/B/C/D 높이)
  const now = new Date();
  const traj = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const ts0 = d.getTime();
    const ts1 = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime();
    const vals = history.filter((h) => (h.ts ?? 0) >= ts0 && (h.ts ?? 0) < ts1).map((h) => totalOf(h.scores));
    const a = vals.length ? Math.round(vals.reduce((x, y) => x + y, 0) / vals.length) : 0;
    const last = i === 5;
    // 기록 없는 달은 0%가 아니라 얇은 밑선으로 — 빈 달과 낮은 점수를 구분한다.
    return { m: `${d.getMonth() + 1}월`, h: a > 0 ? `${Math.max(10, a)}%` : "6px", cls: last && a > 0 ? "bg-primary" : a > 0 ? "bg-primary/70" : "bg-secondary-fixed/50", tip: a > 0 ? grade(a) : undefined, current: last };
  });
  // 날짜를 고르면 그 날, 고르지 않으면 이번 달 전체를 보여준다.
  const selSessions = selected ? byDay.get(selected) || [] : [...byDay.values()].flat();

  return (
    <DashboardLayout active="history" name={app.profile?.name || app.profile?.role} nav={nav}>
      <div className="flex flex-col lg:flex-row gap-gutter-grid">
        {/* Left: Calendar */}
        <section className="flex-[1.2] flex flex-col gap-stack-md">
          <div className="flex justify-between items-center mb-2">
            <h2 className="font-headline-md text-headline-md text-on-surface">학습 캘린더</h2>
            <button onClick={() => setSelected(null)} className="text-primary font-label-sm flex items-center gap-1 hover:underline">
              <span className="material-symbols-outlined text-[20px]">calendar_month</span> 이번 달 전체
            </button>
          </div>
          <div className="rounded-xl p-padding-card flex flex-col h-full bg-white/70 backdrop-blur-md border border-white/60 shadow-card">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-body-lg font-semibold text-on-surface">{cursor.y}년 {cursor.m + 1}월</h3>
              <div className="flex gap-2">
                <button onClick={() => shift(-1)} className="w-8 h-8 rounded-full hover:bg-surface-container-low flex items-center justify-center"><span className="material-symbols-outlined text-[16px]">chevron_left</span></button>
                <button onClick={() => shift(1)} className="w-8 h-8 rounded-full hover:bg-surface-container-low flex items-center justify-center"><span className="material-symbols-outlined text-[16px]">chevron_right</span></button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-y-4 gap-x-2 text-center mb-6">
              {WEEK.map((w) => <div key={w} className="font-label-sm text-outline mb-2">{w}</div>)}
              {cells.map((day, i) => {
                if (day === null) return <div key={i} />;
                const sess = byDay.get(day);
                const best = sess ? Math.max(...sess.map((s) => totalOf(s.scores))) : 0;
                const on = selected === day;
                const bg = on
                  ? "bg-primary text-white shadow-card font-bold ring-2 ring-primary ring-offset-2"
                  : sess
                  ? best >= 80 ? "bg-primary/40 hover:bg-primary/50" : "bg-primary/10 hover:bg-primary/20"
                  : "hover:bg-surface-container-low";
                return (
                  <button key={i} onClick={() => setSelected(day)} className={"py-2 rounded-lg cursor-pointer transition-colors " + bg}>{day}</button>
                );
              })}
            </div>
            <div className="flex-1 flex flex-col gap-3 overflow-y-auto pr-2">
              <h4 className="font-label-sm text-outline mb-1">{selected ? `${cursor.m + 1}월 ${selected}일 활동 내역` : `${cursor.m + 1}월 전체 활동 내역`}</h4>
              {selSessions.length > 0 ? (
                selSessions.map((h, i) => {
                  const sit = getSituation(h.sid, [...app.customSits, ...DEMO_SITS]);
                  const tot = totalOf(h.scores);
                  const done = tot >= 80;
                  return (
                    <div key={i} className="bg-surface rounded-xl p-4 border border-border-light flex gap-4 items-start">
                      <div className={"w-2 rounded-full self-stretch " + (done ? "bg-tertiary" : "bg-progress-orange")} />
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-1">
                          <span className={"font-label-sm px-2 py-0.5 rounded " + (done ? "text-tertiary bg-tertiary/10" : "text-progress-orange bg-progress-orange/10")}>{done ? "완료" : "연습 필요"}</span>
                          <span className="font-label-sm text-outline">{tot}점</span>
                        </div>
                        <h5 className="font-body-md font-semibold text-on-surface mb-1">{sit?.title || h.title || h.sid}</h5>
                        <p className="font-label-sm text-on-surface-variant">{MODE_LABEL[modeOf(h.sid, sit)]} 세션</p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="bg-surface rounded-xl p-6 border border-dashed border-border-light text-center text-on-surface-variant text-sm">
                  {hasHistory ? "이 날은 기록이 없어요." : "아직 훈련 기록이 없어요. 훈련을 마치면 이곳에 쌓입니다."}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Right: Stats + Trajectory */}
        <section className="flex-[1.5] flex flex-col gap-stack-md">
          <div className="flex justify-between items-center mb-2">
            <h2 className="font-headline-md text-headline-md text-on-surface">학습 통계</h2>
            <div className="flex gap-2">
              {([["week", "주간"], ["month", "월간"]] as const).map(([k, label]) => (
                <button
                  key={k}
                  onClick={() => setPeriod(k)}
                  className={
                    "px-3 py-1 rounded-full font-label-sm transition-colors " +
                    (period === k ? "bg-primary text-white shadow-card" : "bg-surface-container-low text-on-surface hover:bg-surface-container-high")
                  }
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="rounded-xl p-5 flex flex-col bg-white/70 backdrop-blur-md border border-white/60 shadow-card">
              <div className="flex items-center gap-2 mb-3 text-outline"><span className="material-symbols-outlined text-[20px]">timer</span><span className="font-label-sm">{period === "week" ? "최근 7일" : "최근 30일"} 세션</span></div>
              <div className="flex items-baseline gap-2"><span className="font-display-lg text-display-lg text-primary">{inPeriod.length}</span><span className="font-body-md text-on-surface-variant">회</span></div>
              <div className="mt-2 text-tertiary font-label-sm flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">timer</span> {inPeriod.length ? studyTime : "첫 훈련을 기다리는 중"}</div>
            </div>
            <div className="rounded-xl p-5 flex flex-col bg-white/70 backdrop-blur-md border border-white/60 shadow-card">
              <div className="flex items-center gap-2 mb-3 text-outline"><span className="material-symbols-outlined text-[20px]">workspace_premium</span><span className="font-label-sm">평균 숙련도</span></div>
              <div className="flex items-baseline gap-2"><span className={"font-display-lg text-display-lg " + tone.text}>{grade(avg)}</span><span className="font-body-md text-on-surface-variant">{inPeriod.length ? `${avg}점` : "기록 없음"}</span></div>
              <div className="mt-2 w-full bg-surface-container-high rounded-full h-1.5 overflow-hidden"><div className={"h-full rounded-full " + tone.bar} style={{ width: `${Math.min(100, avg)}%` }} /></div>
            </div>
          </div>
          <div className="rounded-xl p-6 flex-1 flex flex-col relative overflow-hidden bg-white/70 backdrop-blur-md border border-white/60 shadow-card">
            <div className="flex justify-between items-center mb-6 z-10">
              <div>
                <h3 className="font-body-lg font-semibold text-on-surface">성장 궤적</h3>
                <p className="font-label-sm text-outline">최근 6개월 간의 모드별 숙련도 변화</p>
              </div>
            </div>
            {/* 막대 높이는 점수(0~100) 그대로다. 눈금도 점수로 적어야 위치가 맞는다. */}
            {/* 눈금·막대를 모두 absolute로 깐다 — flex-1 부모는 높이가 auto라 %높이가 0으로 죽는다. */}
            <div className="flex-1 min-h-[220px] relative bg-surface rounded-xl border border-border-light">
              <div className="absolute left-2 top-10 bottom-8 flex flex-col justify-between text-outline font-label-sm">
                <span>100</span><span>75</span><span>50</span><span>25</span>
              </div>
              <div className="absolute left-10 right-4 top-10 bottom-8 border-b border-l border-border-light" />
              <div className="absolute left-12 right-4 top-10 bottom-8 flex items-end z-10">
                {traj.map((t) => (
                  <div key={t.m} className="flex-1 flex justify-center items-end h-full">
                    <div className={"w-full max-w-[44px] rounded-t-sm relative " + t.cls + (t.current && t.tip ? " shadow-pop" : "")} style={{ height: t.h }}>
                      {t.tip && <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-dark text-white font-label-sm py-0.5 px-2 rounded whitespace-nowrap">{t.tip}</div>}
                      <div className={"absolute -bottom-6 left-1/2 -translate-x-1/2 font-label-sm " + (t.current ? "font-bold text-on-surface" : "text-outline")}>{t.m}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}
