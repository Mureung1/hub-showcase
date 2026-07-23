"use client";
import { useMemo, useState } from "react";
import { useApp } from "@/lib/client/store";
import { getSituation, totalOf } from "@/lib/domain/situations";
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
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const [selected, setSelected] = useState<number | null>(new Date().getDate());

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

  const totals = history.map((h) => totalOf(h.scores));
  const avg = totals.length ? Math.round(totals.reduce((a, b) => a + b, 0) / totals.length) : 0;

  // 성장 궤적 (6개월 평균)
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const ts0 = d.getTime();
    const ts1 = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime();
    const vals = history.filter((h) => (h.ts ?? 0) >= ts0 && (h.ts ?? 0) < ts1).map((h) => totalOf(h.scores));
    return { label: `${d.getMonth() + 1}월`, avg: vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0, isLast: i === 5 };
  });
  const selSessions = selected ? byDay.get(selected) || [] : [];

  return (
    <DashboardLayout active="history" name={app.profile?.role || "Profile"} nav={nav}>
      <div className="flex flex-col lg:flex-row gap-gutter-grid">
        {/* 캘린더 */}
        <section className="flex-[1.2] flex flex-col gap-stack-md">
          <div className="flex justify-between items-center mb-2">
            <h2 className="font-headline-md text-headline-md text-on-surface">학습 캘린더</h2>
            <button className="text-primary font-label-sm flex items-center gap-1 hover:underline"><span className="material-symbols-outlined text-[18px]">calendar_month</span> 전체 보기</button>
          </div>
          <div className="bg-white rounded-2xl p-padding-card border border-border-light shadow-[0_4px_20px_rgba(15,23,42,0.05)] flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-body-lg font-semibold text-on-surface">{cursor.y}년 {cursor.m + 1}월</h3>
              <div className="flex gap-2">
                <button onClick={() => shift(-1)} className="w-8 h-8 rounded-full hover:bg-surface-container-low flex items-center justify-center"><span className="material-symbols-outlined text-sm">chevron_left</span></button>
                <button onClick={() => shift(1)} className="w-8 h-8 rounded-full hover:bg-surface-container-low flex items-center justify-center"><span className="material-symbols-outlined text-sm">chevron_right</span></button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-y-3 gap-x-2 text-center mb-6">
              {WEEK.map((w, i) => <div key={w} className={"font-label-sm mb-2 " + (i === 0 ? "text-error" : "text-outline")}>{w}</div>)}
              {cells.map((day, i) => {
                if (day === null) return <div key={i} />;
                const sess = byDay.get(day);
                const best = sess ? Math.max(...sess.map((s) => totalOf(s.scores))) : 0;
                const on = selected === day;
                const bg = on ? "bg-primary text-white font-bold shadow-md ring-2 ring-primary ring-offset-2" : sess ? (best >= 80 ? "bg-primary/40 hover:bg-primary/50" : "bg-primary/10 hover:bg-primary/20") : "hover:bg-surface-container-low";
                return (
                  <button key={i} onClick={() => setSelected(day)} className={"py-2 rounded-lg cursor-pointer transition-colors " + bg}>{day}</button>
                );
              })}
            </div>
            <div className="flex-1 flex flex-col gap-3">
              <h4 className="font-label-sm text-outline mb-1">{selected ? `${cursor.m + 1}월 ${selected}일 활동 내역` : "날짜를 선택하세요"}</h4>
              {selSessions.length === 0 ? (
                <div className="bg-surface rounded-xl p-6 border border-dashed border-border-light text-center text-on-surface-variant text-sm">이 날은 기록이 없어요.</div>
              ) : (
                selSessions.map((h, i) => {
                  const sit = getSituation(h.sid, app.customSits);
                  const tot = totalOf(h.scores);
                  const done = tot >= 80;
                  return (
                    <div key={i} className="bg-surface rounded-xl p-4 border border-border-light flex gap-4 items-start">
                      <div className={"w-2 rounded-full self-stretch " + (done ? "bg-tertiary" : "bg-progress-orange")} />
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-1">
                          <span className={"font-label-sm px-2 py-0.5 rounded text-[10px] " + (done ? "text-tertiary bg-tertiary/10" : "text-progress-orange bg-progress-orange/10")}>{done ? "완료" : "진행중"}</span>
                          <span className="font-label-sm text-outline text-[10px]">{tot}점</span>
                        </div>
                        <h5 className="font-body-md font-semibold text-on-surface mb-1">{sit?.title || h.sid}</h5>
                        <p className="font-label-sm text-on-surface-variant text-[11px]">대화 훈련 세션</p>
                      </div>
                    </div>
                  );
                })
              )}
              {history.length === 0 && (
                <button onClick={() => nav("chat")} className="mt-2 py-2.5 rounded-lg bg-primary text-white text-sm font-bold">첫 훈련 시작하기</button>
              )}
            </div>
          </div>
        </section>

        {/* 통계 */}
        <section className="flex-[1.5] flex flex-col gap-stack-md">
          <div className="flex justify-between items-center mb-2">
            <h2 className="font-headline-md text-headline-md text-on-surface">학습 통계</h2>
            <div className="flex gap-2">
              <button className="px-3 py-1 bg-surface-container-low rounded-full font-label-sm text-on-surface">주간</button>
              <button className="px-3 py-1 bg-primary text-white rounded-full font-label-sm shadow-sm">월간</button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl p-5 border border-border-light shadow-[0_4px_20px_rgba(15,23,42,0.05)] flex flex-col">
              <div className="flex items-center gap-2 mb-3 text-outline"><span className="material-symbols-outlined text-[18px]">timer</span><span className="font-label-sm">총 세션</span></div>
              <div className="flex items-baseline gap-2"><span className="font-display-lg text-display-lg text-primary">{history.length}</span><span className="font-body-md text-on-surface-variant">회</span></div>
            </div>
            <div className="bg-white rounded-2xl p-5 border border-border-light shadow-[0_4px_20px_rgba(15,23,42,0.05)] flex flex-col">
              <div className="flex items-center gap-2 mb-3 text-outline"><span className="material-symbols-outlined text-[18px]">workspace_premium</span><span className="font-label-sm">평균 숙련도</span></div>
              <div className="flex items-baseline gap-2"><span className="font-display-lg text-display-lg text-slate-dark">{grade(avg)}</span><span className="font-body-md text-on-surface-variant">{avg}점</span></div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-padding-card border border-border-light shadow-[0_4px_20px_rgba(15,23,42,0.05)] flex-1">
            <h3 className="font-headline-md text-headline-md text-on-surface text-lg mb-1">성장 궤적</h3>
            <p className="font-label-sm text-on-surface-variant mb-6">최근 6개월 간의 평균 총점 변화</p>
            <div className="flex items-end justify-between gap-3 h-52">
              {months.map((m, i) => {
                const h = Math.max(4, m.avg);
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                    <div className="relative w-full flex justify-center items-end flex-1">
                      {m.isLast && m.avg > 0 && <span className="absolute -top-1 bg-slate-dark text-white text-[10px] font-bold px-1.5 py-0.5 rounded">{grade(m.avg)}</span>}
                      <div className={"w-full max-w-[40px] rounded-t-md " + (m.isLast ? "bg-primary" : m.avg > 0 ? "bg-primary-fixed-dim" : "bg-surface-variant")} style={{ height: `${h}%` }} />
                    </div>
                    <span className={"text-[11px] " + (m.isLast ? "text-primary font-bold" : "text-on-surface-variant")}>{m.label}</span>
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
