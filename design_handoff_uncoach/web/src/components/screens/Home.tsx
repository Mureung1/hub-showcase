"use client";
import { useApp } from "@/lib/client/store";
import { getSituation, totalOf } from "@/lib/domain/situations";
import { levelInfo, totalXP } from "@/lib/domain/gamification";
import DashboardLayout from "@/components/stitch/DashboardLayout";
import type { ScreenKey } from "@/components/AppShell";

const WEEK = ["일", "월", "화", "수", "목", "금", "토"];

export default function Home({ nav }: { nav: (k: ScreenKey) => void }) {
  const app = useApp();
  const history = app.history;
  const lvl = levelInfo(totalXP(history));
  const name = app.profile?.role || "";

  // 이번 주(일~토) 세션 수
  const now = new Date();
  const ws = new Date(now);
  ws.setHours(0, 0, 0, 0);
  ws.setDate(now.getDate() - now.getDay());
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(ws);
    d.setDate(ws.getDate() + i);
    const next = d.getTime() + 86400000;
    const count = history.filter((h) => (h.ts ?? 0) >= d.getTime() && (h.ts ?? 0) < next).length;
    return { count, isToday: i === now.getDay() };
  });
  const maxC = Math.max(1, ...week.map((w) => w.count));

  const recent = history.slice(-3).reverse().map((h) => ({ h, sit: getSituation(h.sid, app.customSits), total: totalOf(h.scores) }));

  return (
    <DashboardLayout active="home" name={name || "Profile"} nav={nav}>
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface mb-1">
            안녕하세요{name ? `, ${name}님` : ""} 👋
          </h2>
          <p className="text-on-surface-variant">오늘도 상황에 맞는 &apos;적절한 말&apos;을 훈련해볼까요?</p>
        </div>
        <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl shadow-sm border border-border-light">
          <div className="text-right">
            <p className="font-label-sm text-label-sm text-on-surface-variant">내 레벨</p>
            <p className="font-stats-number text-stats-number text-primary">Lv {lvl.level}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center text-progress-orange">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>trophy</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* 학습 활동 */}
        <div className="md:col-span-8 bg-white rounded-2xl p-padding-card shadow-[0_4px_20px_rgba(15,23,42,0.05)] border border-border-light flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-headline-md text-headline-md text-on-surface">학습 활동</h3>
            <select className="bg-surface-container-lowest border border-border-light rounded-lg px-3 py-1 text-sm text-on-surface-variant">
              <option>이번 주</option>
            </select>
          </div>
          <div className="flex-1 min-h-[240px] relative bg-surface rounded-xl flex items-end p-4 gap-2 border border-border-light/50">
            {week.map((w, i) => (
              <div key={i} className="flex-1 flex justify-center items-end h-full">
                <div
                  className={"w-8 md:w-12 rounded-t-md relative " + (w.isToday ? "bg-primary" : w.count > 0 ? "bg-primary-fixed-dim" : "bg-surface-variant")}
                  style={{ height: `${Math.max(5, (w.count / maxC) * 100)}%` }}
                >
                  {w.isToday && w.count > 0 && (
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-dark text-white text-xs py-1 px-2 rounded whitespace-nowrap">{w.count}회</div>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs text-on-surface-variant mt-2 px-2">
            {["월", "화", "수", "목", "금", "토", "일"].map((d) => <span key={d}>{d}</span>)}
          </div>
        </div>

        {/* 다음 목표 */}
        <div className="md:col-span-4 bg-white rounded-2xl p-padding-card shadow-[0_4px_20px_rgba(15,23,42,0.05)] border border-border-light flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-headline-md text-headline-md text-on-surface">다음 목표</h3>
            <button className="text-primary"><span className="material-symbols-outlined">more_horiz</span></button>
          </div>
          <div className="space-y-4 flex-1">
            <Goal icon="mail" bg="bg-secondary-fixed" fg="text-primary" title="비즈니스 이메일 작성" sub="Mail Mode • 45분 소요 예상" onClick={() => nav("mail")} />
            <Goal icon="forum" bg="bg-orange-100" fg="text-progress-orange" title="불만 고객 응대 실습" sub="Chat Mode • 30분 소요 예상" onClick={() => nav("chat")} />
            <Goal icon="newspaper" bg="bg-green-100" fg="text-tertiary" title="뉴스 트렌드 요약" sub="News Mode • 핵심 짚기" onClick={() => nav("news")} />
          </div>
          <button onClick={() => nav("history")} className="w-full mt-4 py-2 border border-border-light rounded-lg text-on-surface-variant font-medium hover:bg-surface-container-low transition-colors">
            전체 일정 보기
          </button>
        </div>

        {/* 추천 훈련 모드 */}
        <div className="md:col-span-12 mt-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-headline-md text-headline-md text-on-surface">추천 훈련 모드</h3>
            <button onClick={() => nav("training")} className="text-sm font-medium text-primary hover:underline">모두 보기</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ModeCard icon="mail" iconBg="bg-primary" badge="기본 과정" badgeCls="bg-primary-fixed text-on-primary-fixed-variant" title="이메일 소통 기본기" desc="정확하고 정중한 비즈니스 이메일 작성을 위한 기초 훈련입니다." sessions="12 세션" rating="4.8" onClick={() => nav("mail")} />
            <ModeCard icon="forum" iconBg="bg-tertiary" badge="심화 과정" badgeCls="bg-tertiary-fixed text-on-tertiary-fixed-variant" title="위기 관리 대화법" desc="감정이 격해진 고객이나 팀원과의 원활한 소통을 연습합니다." sessions="8 세션" rating="4.9" onClick={() => nav("chat")} />
            <ModeCard icon="newspaper" iconBg="bg-primary-container" badge="읽기" badgeCls="bg-secondary-fixed text-on-secondary-fixed-variant" title="뉴스 핵심 요약" desc="복잡한 기사를 읽고 핵심을 한 줄로 짚는 연습을 합니다." sessions="5 카테고리" rating="4.7" onClick={() => nav("news")} />
          </div>
        </div>

        {/* 최근 훈련 기록 */}
        <div className="md:col-span-12 bg-white rounded-2xl p-padding-card shadow-[0_4px_20px_rgba(15,23,42,0.05)] border border-border-light mt-2">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-headline-md text-headline-md text-on-surface">최근 훈련 기록</h3>
            <button onClick={() => nav("history")} className="text-sm font-medium text-primary hover:underline">모두 보기</button>
          </div>
          {recent.length === 0 ? (
            <div className="py-8 text-center text-on-surface-variant text-sm">아직 기록이 없어요. 위에서 훈련을 시작하면 여기에 쌓입니다.</div>
          ) : (
            <div className="space-y-3">
              {recent.map(({ h, sit, total }, i) => {
                const done = total >= 80;
                return (
                  <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-border-light hover:bg-[#F1F5F9] transition-all gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-surface flex items-center justify-center text-primary border border-border-light">
                        <span className="material-symbols-outlined">forum</span>
                      </div>
                      <div>
                        <h4 className="font-bold text-on-surface text-sm sm:text-base">{sit?.title || h.sid}</h4>
                        <p className="text-xs text-on-surface-variant">대화 훈련 • {h.d}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                      <div className="flex items-center gap-2 w-32">
                        <div className="flex-1 h-2 bg-surface-container-high rounded-full overflow-hidden">
                          <div className={"h-full rounded-full " + (done ? "bg-tertiary" : "bg-progress-orange")} style={{ width: `${total}%` }} />
                        </div>
                        <span className={"text-xs font-medium " + (done ? "text-tertiary" : "text-on-surface-variant")}>{total}%</span>
                      </div>
                      <span className={"px-3 py-1 text-xs rounded-full font-medium whitespace-nowrap " + (done ? "bg-tertiary-fixed text-on-tertiary-fixed-variant" : "bg-secondary-fixed text-on-secondary-fixed-variant")}>
                        {done ? "완료됨" : "진행 중"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

function Goal({ icon, bg, fg, title, sub, onClick }: { icon: string; bg: string; fg: string; title: string; sub: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-surface-container-low transition-colors border border-transparent hover:border-border-light cursor-pointer group text-left">
      <div className={"w-12 h-12 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform " + bg + " " + fg}>
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

function ModeCard({ icon, iconBg, badge, badgeCls, title, desc, sessions, rating, onClick }: { icon: string; iconBg: string; badge: string; badgeCls: string; title: string; desc: string; sessions: string; rating: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="text-left bg-white rounded-xl p-5 shadow-[0_4px_20px_rgba(15,23,42,0.05)] border border-border-light hover:-translate-y-1 transition-transform cursor-pointer relative overflow-hidden">
      <div className="flex items-start justify-between mb-4 relative z-10">
        <div className={"w-10 h-10 rounded-lg text-white flex items-center justify-center shadow-md " + iconBg}>
          <span className="material-symbols-outlined">{icon}</span>
        </div>
        <span className={"text-xs px-2 py-1 rounded-md font-medium " + badgeCls}>{badge}</span>
      </div>
      <h4 className="font-bold text-on-surface mb-1">{title}</h4>
      <p className="text-sm text-on-surface-variant mb-4 line-clamp-2">{desc}</p>
      <div className="flex items-center justify-between text-xs text-slate-muted">
        <div className="flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">timer</span> {sessions}</div>
        <div className="flex items-center gap-1"><span className="material-symbols-outlined text-[16px] text-progress-orange">star</span> {rating}</div>
      </div>
    </button>
  );
}
