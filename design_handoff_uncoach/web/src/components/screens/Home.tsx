"use client";
import { useEffect, useState } from "react";
import { useApp } from "@/lib/client/store";
import { getSituation, situationsForRole, totalOf, modeOf, MODE_LABEL, MODE_ICON, type ModeKey } from "@/lib/domain/situations";
import { DEMO_SITS } from "@/lib/domain/demo-sits";
import { NEWS_CATEGORIES } from "@/lib/domain/news-categories";
import { computeStreak, levelInfo, totalXP, dailyGoal, type DailyGoalInfo } from "@/lib/domain/gamification";
import DashboardLayout from "@/components/stitch/DashboardLayout";
import type { Situation } from "@/lib/domain/types";
import type { ScreenKey } from "@/components/AppShell";

const WEEKDAYS = ["월", "화", "수", "목", "금", "토", "일"];

export default function Home({ nav, start }: { nav: (k: ScreenKey) => void; start: (sit: Situation) => void }) {
  const app = useApp();
  const history = app.history;
  const role = app.profile?.role;
  const name = app.profile?.name || app.profile?.role || "진수";
  const [range, setRange] = useState<"week" | "month">("week");
  const [filter, setFilter] = useState<"all" | "done" | "ongoing">("all");

  // 학습 활동 그래프 — 이번 주는 요일별, 최근 4주는 주별로 집계한다.
  const todayIdx = (new Date().getDay() + 6) % 7; // 월=0
  const monday = new Date();
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - todayIdx);
  const countIn = (from: number, to: number) => history.filter((h) => (h.ts ?? 0) >= from && (h.ts ?? 0) < to).length;

  const weekly = WEEKDAYS.map((d, i) => ({ label: d, n: countIn(monday.getTime() + i * 86400000, monday.getTime() + (i + 1) * 86400000) }));
  const monthly = Array.from({ length: 4 }, (_, i) => {
    const from = monday.getTime() - (3 - i) * 7 * 86400000;
    return { label: i === 3 ? "이번 주" : `${3 - i}주 전`, n: countIn(from, from + 7 * 86400000) };
  });
  const series = range === "week" ? weekly : monthly;
  const hasData = series.some((s) => s.n > 0);

  // 차트 아래 요약 — 그래프와 같은 기간의 수치를 숫자로도 보여준다.
  const from = range === "week" ? monday.getTime() : monday.getTime() - 21 * 86400000;
  const inRange = history.filter((h) => (h.ts ?? 0) >= from);
  const rangeAvg = inRange.length ? Math.round(inRange.reduce((a, h) => a + totalOf(h.scores), 0) / inRange.length) : 0;
  const streak = computeStreak(history);
  // 눈금 상한을 최소 4로 둔다 — 1회 훈련이 차트를 꽉 채워버리면 추이를 못 읽는다.
  const maxC = Math.max(4, ...series.map((s) => s.n));
  const curIdx = range === "week" ? todayIdx : 3;
  const bars = series.map((s, i) => ({
    label: s.label,
    h: s.n > 0 ? `${Math.max(10, (s.n / maxC) * 100)}%` : "6px",
    cls: i === curIdx && s.n > 0 ? "bg-primary" : s.n > 0 ? "bg-primary-fixed-dim" : "bg-surface-variant",
    tip: s.n > 0 ? `${s.n}회` : undefined,
  }));

  // 직업에 맞춘 추천 상황 — 다음 목표·추천 카드가 모두 여기서 나온다.
  const chatSits = situationsForRole(role, "chat");
  const mailSits = situationsForRole(role, "email");
  const doneIds = new Set(history.map((h) => h.sid));
  const freshChat = chatSits.filter((s) => !doneIds.has(s.id));
  const nextChat = freshChat[0] ?? chatSits[0];
  const nextMail = mailSits.find((s) => !doneIds.has(s.id)) ?? mailSits[0];
  const deepChat = freshChat[1] ?? chatSits.find((s) => s.id !== nextChat?.id) ?? nextChat;

  // 모드별 실적 (추천 카드용)
  const modeStat = (mode: ModeKey) => {
    const rows = history.filter((h) => modeOf(h.sid, getSituation(h.sid, [...app.customSits, ...DEMO_SITS])) === mode);
    const n = rows.length;
    return { n, avg: n ? Math.round(rows.reduce((a, h) => a + totalOf(h.scores), 0) / n) : 0 };
  };
  const mailStat = modeStat("email");
  const chatStat = modeStat("chat");

  // 최근 훈련 기록 (실데이터) — 상단 칩으로 걸러 본다.
  const recent = history
    .filter((h) => (filter === "all" ? true : filter === "done" ? totalOf(h.scores) >= 80 : totalOf(h.scores) < 80))
    .slice(-3)
    .reverse()
    .map((h) => {
      const sit = getSituation(h.sid, [...app.customSits, ...DEMO_SITS]);
      const tot = totalOf(h.scores);
      const done = tot >= 80;
      const mode = modeOf(h.sid, sit);
      return {
        icon: MODE_ICON[mode],
        iconColor: done ? "text-tertiary" : "text-primary",
        title: sit?.title || h.title || h.sid,
        sub: `${MODE_LABEL[mode]} • ${h.d}`,
        pct: tot,
        barCls: done ? "bg-tertiary" : "bg-progress-orange",
        pctCls: done ? "text-tertiary" : "text-on-surface-variant",
        badge: done ? "완료" : "연습 필요",
        badgeCls: done ? "bg-tertiary-fixed text-on-tertiary-fixed-variant" : "bg-secondary-fixed text-on-secondary-fixed-variant",
      };
    });
  const lvl = levelInfo(totalXP(history));
  const goal = dailyGoal(history);

  return (
    <DashboardLayout active="home" name={name} nav={nav}>
      {/* Welcome Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface mb-1">안녕하세요, {name}님 👋</h2>
          <p className="text-on-surface-variant">오늘도 힘차게 훈련을 시작해볼까요?</p>
        </div>
        <div className="flex items-center gap-3">
          <DailyGoalRing {...goal} />
          <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl shadow-card border border-border-light">
            <div className="text-right">
              <p className="font-label-sm text-label-sm text-on-surface-variant">내 레벨</p>
              <p className="font-stats-number text-stats-number text-primary">Lv. {lvl.level}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center text-progress-orange">
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>trophy</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* 학습 활동 */}
        <div className="md:col-span-8 bg-white rounded-xl p-padding-card shadow-card border border-border-light flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-headline-md text-headline-md text-on-surface">학습 활동</h3>
            <select
              value={range}
              onChange={(e) => setRange(e.target.value as "week" | "month")}
              className="bg-surface-container-lowest border border-border-light rounded-lg px-3 py-1 text-sm text-on-surface-variant focus:ring-primary focus:border-primary"
            >
              <option value="week">이번 주</option>
              <option value="month">최근 4주</option>
            </select>
          </div>
          {/* pt-10: 막대 위 말풍선이 잘리지 않게 확보하는 여백 */}
          <div className="flex-1 min-h-[240px] max-h-[280px] relative bg-surface rounded-xl flex items-end p-4 pt-10 gap-2 border border-border-light/50">
            {!hasData && (
              <div className="absolute inset-0 flex items-center justify-center text-sm text-on-surface-variant pointer-events-none">
                {range === "week" ? "이번 주" : "최근 4주"} 훈련 기록이 아직 없어요.
              </div>
            )}
            {bars.map((b, i) => (
              <div key={i} className="flex-1 flex justify-center items-end h-full">
                <div className={"w-full max-w-[56px] rounded-t-md relative " + b.cls} style={{ height: b.h }}>
                  {b.tip && (
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-dark text-white text-xs py-1 px-2 rounded whitespace-nowrap">{b.tip}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs text-on-surface-variant mt-2 px-2">
            {bars.map((b) => <span key={b.label} className="flex-1 text-center">{b.label}</span>)}
          </div>
          {/* 막대만으론 안 읽히는 값 — 같은 기간의 횟수·평균과 연속일을 숫자로 받쳐준다. */}
          <div className="mt-auto pt-4 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-border-light text-sm">
            <Summary label="훈련" value={`${inRange.length}회`} />
            <Summary label="평균" value={inRange.length ? `${rangeAvg}점` : "—"} />
            <Summary label="연속" value={streak.current ? `${streak.current}일` : "—"} />
          </div>
        </div>

        {/* 다음 목표 */}
        <div className="md:col-span-4 bg-white rounded-xl p-padding-card shadow-card border border-border-light flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-headline-md text-headline-md text-on-surface">다음 목표</h3>
            <span className="font-label-sm text-label-sm text-outline">{role ? `${role} 추천` : "추천"}</span>
          </div>
          <div className="space-y-4 flex-1">
            {nextMail && (
              <Goal icon="mail" wrap="bg-secondary-fixed text-primary" title={nextMail.title} sub={`메일 훈련 • ${nextMail.goal}`} onClick={() => start(nextMail)} />
            )}
            {nextChat && (
              <Goal icon="forum" wrap="bg-orange-100 text-progress-orange" title={nextChat.title} sub={`대화 훈련 • ${nextChat.goal}`} onClick={() => start(nextChat)} />
            )}
            <Goal icon="newspaper" wrap="bg-green-100 text-tertiary" title="오늘의 뉴스 요약" sub={`뉴스 훈련 • ${NEWS_CATEGORIES.length}개 분야 중 선택`} onClick={() => nav("newsPicker")} />
          </div>
          <button onClick={() => nav("history")} className="w-full mt-4 py-2 border border-border-light rounded-lg text-on-surface-variant font-medium hover:bg-surface-container-low transition-colors">전체 학습 기록 보기</button>
        </div>

        {/* 추천 훈련 모드 */}
        <div className="md:col-span-12 mt-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-headline-md text-headline-md text-on-surface">추천 훈련 모드</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {nextMail && (
              <RecCard
                onClick={() => start(nextMail)}
                icon="mail"
                iconCls="bg-primary text-white"
                blobCls="bg-primary-fixed-dim"
                badge="메일 훈련"
                badgeCls="bg-primary-fixed text-on-primary-fixed-variant"
                title={nextMail.title}
                desc={nextMail.goal}
                stat={<ModeStat n={mailStat.n} avg={mailStat.avg} />}
              />
            )}
            {deepChat && (
              <RecCard
                onClick={() => start(deepChat)}
                icon="forum"
                iconCls="bg-tertiary text-white"
                blobCls="bg-tertiary-fixed-dim"
                badge="대화 훈련"
                badgeCls="bg-tertiary-fixed text-on-tertiary-fixed-variant"
                title={deepChat.title}
                desc={deepChat.goal}
                stat={<ModeStat n={chatStat.n} avg={chatStat.avg} />}
              />
            )}
            {/* CTA Card */}
            <button onClick={() => nav("training")} className="bg-primary rounded-xl p-5 shadow-pop hover:scale-[1.02] transition-transform cursor-pointer flex flex-col items-center justify-center text-center h-full min-h-[200px] group">
              <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mb-4 group-hover:bg-white/30 transition-colors">
                <span className="material-symbols-outlined text-white text-[28px]">trending_flat</span>
              </div>
              <h4 className="font-bold text-white text-xl mb-2">다른 훈련 둘러보기</h4>
              <p className="text-white/80 text-sm">대화·메일·뉴스 중에서<br />직접 상황을 골라보세요</p>
            </button>
          </div>
        </div>

        {/* 최근 훈련 기록 */}
        <div className="md:col-span-12 bg-white rounded-xl p-padding-card shadow-card border border-border-light mt-2">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-headline-md text-headline-md text-on-surface">최근 훈련 기록</h3>
            <div className="flex gap-2">
              {([["all", "전체"], ["ongoing", "연습 필요"], ["done", "완료"]] as const).map(([k, label]) => (
                <button
                  key={k}
                  onClick={() => setFilter(k)}
                  className={
                    "text-xs font-medium px-2 py-1 rounded transition-colors " +
                    (filter === k
                      ? "bg-primary text-white"
                      : "bg-white border border-border-light text-slate-muted hover:bg-surface-container-low")
                  }
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            {recent.length > 0 ? (
              recent.map((r, i) => <RecentItem key={i} {...r} />)
            ) : (
              <div className="p-8 text-center border border-dashed border-border-light rounded-xl text-sm text-on-surface-variant">
                {history.length === 0
                  ? "아직 훈련 기록이 없어요. 위 추천 모드에서 첫 훈련을 시작해보세요."
                  : filter === "done"
                  ? "80점 이상으로 마친 훈련이 아직 없어요."
                  : "더 연습이 필요한 훈련이 없어요. 잘하고 있어요."}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function RecCard({ onClick, icon, iconCls, blobCls, badge, badgeCls, title, desc, stat }: {
  onClick: () => void; icon: string; iconCls: string; blobCls: string; badge: string; badgeCls: string; title: string; desc: string; stat: React.ReactNode;
}) {
  return (
    <button onClick={onClick} className="text-left bg-white rounded-xl p-5 shadow-card border border-border-light hover:-translate-y-1 transition-transform cursor-pointer relative overflow-hidden flex flex-col">
      <div className={"absolute top-0 right-0 w-24 h-24 rounded-bl-full opacity-20 " + blobCls} />
      <div className="flex items-start justify-between mb-4 relative z-10">
        <div className={"w-10 h-10 rounded-lg flex items-center justify-center shadow-card " + iconCls}><span className="material-symbols-outlined">{icon}</span></div>
        <span className={"text-xs px-2 py-1 rounded-md font-medium " + badgeCls}>{badge}</span>
      </div>
      <h4 className="font-bold text-on-surface mb-1">{title}</h4>
      <p className="text-sm text-on-surface-variant mb-4 line-clamp-2 flex-1">{desc}</p>
      {stat}
      <div className="mt-4 flex justify-end"><span className="bg-primary text-white text-xs font-bold px-4 py-2 rounded-lg">훈련 시작하기</span></div>
    </button>
  );
}

/**
 * 오늘의 목표 링 — 듀오링고식 일일 XP 진행. 자정에 리셋(오늘 세션 총점 합).
 * 마운트 시 0→목표까지 한 번 채워지는 스윕으로 진행을 전달한다(prefers-reduced-motion이면 즉시).
 */
function DailyGoalRing({ earned, goal, progress, met }: DailyGoalInfo) {
  const R = 18;
  const C = 2 * Math.PI * R;
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setShown(progress);
      return;
    }
    const id = requestAnimationFrame(() => setShown(progress));
    return () => cancelAnimationFrame(id);
  }, [progress]);

  return (
    <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl shadow-card border border-border-light">
      <div className="text-right">
        <p className="font-label-sm text-label-sm text-on-surface-variant">오늘의 목표</p>
        <p className="font-stats-number text-stats-number text-primary">
          {earned}<span className="text-outline text-sm font-normal"> / {goal} XP</span>
        </p>
      </div>
      <div className="relative w-10 h-10 shrink-0">
        <svg viewBox="0 0 44 44" className="w-10 h-10 -rotate-90">
          <circle cx="22" cy="22" r={R} fill="none" strokeWidth="4" stroke="currentColor" className="text-surface-container-high" />
          <circle
            cx="22" cy="22" r={R} fill="none" strokeWidth="4" strokeLinecap={shown > 0 ? "round" : "butt"} stroke="currentColor"
            className={met ? "text-tertiary" : "text-primary"}
            strokeDasharray={C}
            style={{ strokeDashoffset: C * (1 - shown), transition: "stroke-dashoffset 800ms cubic-bezier(0.22, 1, 0.36, 1)" }}
          />
        </svg>
        <span
          className={"material-symbols-outlined absolute inset-0 transition-colors " + (met ? "text-tertiary" : "text-progress-orange")}
          // material-symbols 폰트 CSS가 display·font-size를 덮어써 flex/text-[18px] 유틸이 무력화된다.
          // 인라인(최고 우선순위)으로 강제해야 아이콘이 링 안에 세로 중앙으로 앉는다.
          style={{ display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, lineHeight: 1, ...(met ? { fontVariationSettings: "'FILL' 1" } : null) }}
        >
          {met ? "check_circle" : "local_fire_department"}
        </span>
      </div>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="font-label-sm text-outline">{label}</span>
      <span className="font-bold text-on-surface">{value}</span>
    </div>
  );
}

function ModeStat({ n, avg }: { n: number; avg: number }) {
  if (n === 0) return <p className="text-xs text-slate-muted">아직 훈련 기록이 없어요</p>;
  return (
    <div className="flex items-center justify-between text-xs text-slate-muted">
      <div className="flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">timer</span> {n} 세션</div>
      <div className="flex items-center gap-1"><span className="material-symbols-outlined text-[16px] text-progress-orange">star</span> 평균 {avg}점</div>
    </div>
  );
}

function Goal({ icon, wrap, title, sub, onClick }: { icon: string; wrap: string; title: string; sub: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full text-left flex items-center gap-4 p-3 rounded-xl hover:bg-surface-container-low transition-colors border border-transparent hover:border-border-light cursor-pointer group">
      <div className={"w-12 h-12 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform " + wrap}>
        <span className="material-symbols-outlined">{icon}</span>
      </div>
      <div className="flex-1">
        <h4 className="font-medium text-on-surface">{title}</h4>
        <p className="text-xs text-on-surface-variant">{sub}</p>
      </div>
      <span className="material-symbols-outlined text-slate-muted group-hover:text-primary transition-colors">chevron_right</span>
    </button>
  );
}

function RecentItem({ icon, iconColor, title, sub, pct, barCls, pctCls, badge, badgeCls }: { icon: string; iconColor: string; title: string; sub: string; pct: number; barCls: string; pctCls: string; badge: string; badgeCls: string }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-border-light hover:bg-[#F1F5F9] hover:border-l-4 hover:border-l-primary transition-all gap-4">
      <div className="flex items-center gap-4">
        <div className={"w-10 h-10 rounded-lg bg-surface flex items-center justify-center border border-border-light " + iconColor}>
          <span className="material-symbols-outlined">{icon}</span>
        </div>
        <div>
          <h4 className="font-bold text-on-surface text-sm sm:text-base">{title}</h4>
          <p className="text-xs text-on-surface-variant">{sub}</p>
        </div>
      </div>
      <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
        <div className="flex items-center gap-2 w-32">
          <div className="flex-1 h-2 bg-surface-container-high rounded-full overflow-hidden">
            <div className={"h-full rounded-full " + barCls} style={{ width: `${pct}%` }} />
          </div>
          <span className={"text-xs font-medium " + pctCls}>{pct}%</span>
        </div>
        <span className={"px-3 py-1 text-xs rounded-full font-medium whitespace-nowrap " + badgeCls}>{badge}</span>
      </div>
    </div>
  );
}
