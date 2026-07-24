"use client";
import { useApp } from "@/lib/client/store";
import { getSituation, totalOf, modeOf, MODE_LABEL, MODE_ICON, type ModeKey } from "@/lib/domain/situations";
import { DEMO_SITS } from "@/lib/domain/demo-sits";
import DashboardLayout from "@/components/stitch/DashboardLayout";
import type { ScreenKey } from "@/components/AppShell";

function ModeStat({ n, avg }: { n: number; avg: number }) {
  if (n === 0) return <p className="text-xs text-slate-muted">아직 기록 없음</p>;
  return <p className="text-xs text-slate-muted">{n}회 · 평균 <span className="font-bold text-tertiary">{avg}점</span></p>;
}

export default function TrainingModes({ nav }: { nav: (k: ScreenKey) => void }) {
  const app = useApp();

  // 모드별 실적 (대화/뉴스/메일)
  const modeStat = (mode: ModeKey) => {
    const rows = app.history.filter((h) => modeOf(h.sid, getSituation(h.sid, [...app.customSits, ...DEMO_SITS])) === mode);
    const n = rows.length;
    return { n, avg: n ? Math.round(rows.reduce((a, h) => a + totalOf(h.scores), 0) / n) : 0 };
  };
  const chatStat = modeStat("chat");
  const mailStat = modeStat("email");
  const newsStat = modeStat("news");

  // 최근 훈련 (실데이터) — 기록이 없으면 아래 안내 문구로 대체된다.
  const recent = app.history
    .slice(-2)
    .reverse()
    .map((h) => {
      const sit = getSituation(h.sid, [...app.customSits, ...DEMO_SITS]);
      const tot = totalOf(h.scores);
      const mode = modeOf(h.sid, sit);
      return {
        key: h.ts ?? h.sid,
        icon: MODE_ICON[mode],
        wrap: mode === "email" ? "bg-secondary-container/30 text-primary" : mode === "news" ? "bg-tertiary-container/10 text-tertiary" : "bg-chat-bg-user text-primary",
        title: sit?.title || h.title || h.sid,
        mode: MODE_LABEL[mode],
        done: tot >= 80,
        total: tot,
      };
    });

  return (
    <DashboardLayout active="training" name={app.profile?.name || app.profile?.role} nav={nav}>
      {/* Header */}
      <header className="flex justify-between items-center mb-12">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface mb-2">원하는 훈련 방식을 선택하세요</h2>
        </div>
      </header>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter-grid">
        {/* Chat Mode */}
        <div className="bg-surface-container-lowest rounded-xl shadow-card border border-border-light/50 p-padding-card flex flex-col group hover:shadow-float hover:border-primary/20 transition-all duration-300">
          <div className="flex justify-between items-start mb-6">
            <div className="w-14 h-14 rounded-xl bg-chat-bg-user text-primary flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <span className="material-symbols-outlined text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>forum</span>
            </div>
          </div>
          <h3 className="font-headline-md text-headline-md text-on-surface mb-3">대화 훈련</h3>
          <p className="font-body-md text-body-md text-on-surface-variant mb-8 flex-1">상대·관계에 맞춰 실시간으로 주고받는 메시지를 연습하고 즉각적인 피드백을 받습니다. 대화의 흐름과 공감 능력을 함께 키웁니다.</p>
          <div className="flex items-center justify-between border-t border-border-light pt-4">
            <ModeStat n={chatStat.n} avg={chatStat.avg} />
            <button onClick={() => nav("chatPicker")} className="bg-primary text-white font-label-sm text-label-sm font-bold px-6 py-3 rounded-lg hover:bg-primary-container hover:text-on-primary-container transition-colors shadow-card">훈련하기</button>
          </div>
        </div>

        {/* Mail Mode */}
        <div className="bg-surface-container-lowest rounded-xl shadow-card border border-border-light/50 p-padding-card flex flex-col group hover:shadow-float hover:border-primary/20 transition-all duration-300">
          <div className="flex justify-between items-start mb-6">
            <div className="w-14 h-14 rounded-xl bg-secondary-container/30 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <span className="material-symbols-outlined text-[28px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>mail</span>
            </div>
          </div>
          <h3 className="font-headline-md text-headline-md text-on-surface mb-3">메일 훈련</h3>
          <p className="font-body-md text-body-md text-on-surface-variant mb-8 flex-1">정중하고 정확한 비즈니스 이메일을 쓰며 어조·명확성·구조를 익힙니다.</p>
          <div className="flex items-center justify-between border-t border-border-light pt-4 mt-auto">
            <ModeStat n={mailStat.n} avg={mailStat.avg} />
            <button onClick={() => nav("mailPicker")} className="bg-primary text-white font-label-sm text-label-sm font-bold px-6 py-3 rounded-lg hover:bg-primary-container hover:text-on-primary-container transition-colors shadow-card">훈련하기</button>
          </div>
        </div>

        {/* News Mode */}
        <div className="bg-surface-container-lowest rounded-xl shadow-card border border-border-light/50 p-padding-card flex flex-col group hover:shadow-float hover:border-primary/20 transition-all duration-300">
          <div className="flex justify-between items-start mb-6">
            <div className="w-14 h-14 rounded-xl bg-tertiary-container/10 text-tertiary flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <span className="material-symbols-outlined text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>newspaper</span>
            </div>
          </div>
          <h3 className="font-headline-md text-headline-md text-on-surface mb-3">뉴스 요약 훈련</h3>
          <p className="font-body-md text-body-md text-on-surface-variant mb-8 flex-1">복잡한 기사를 읽고 핵심을 간결하게 요약하는 연습으로 이해력과 정보 추출 능력을 키웁니다.</p>
          <div className="flex items-center justify-between border-t border-border-light pt-4 mt-auto">
            {newsStat.n ? <ModeStat n={newsStat.n} avg={newsStat.avg} /> : <p className="text-xs text-slate-muted">최신 기사를 실시간으로 가져와요</p>}
            <button onClick={() => nav("newsPicker")} className="bg-primary text-white font-label-sm text-label-sm font-bold px-6 py-3 rounded-lg hover:bg-primary-container hover:text-on-primary-container transition-colors shadow-card">훈련하기</button>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <section className="mt-12">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-headline-md text-headline-md text-on-surface">최근 훈련</h3>
          <button onClick={() => nav("history")} className="font-label-sm text-label-sm text-primary hover:underline flex items-center gap-1">모두 보기<span className="material-symbols-outlined text-[16px]">arrow_forward</span></button>
        </div>
        <div className="bg-surface-container-lowest rounded-xl shadow-card border border-border-light/50 overflow-hidden">
          <div className="divide-y divide-border-light">
            {recent.length === 0 ? (
              <p className="p-8 text-center font-body-md text-body-md text-on-surface-variant">아직 훈련 기록이 없어요. 위에서 원하는 훈련을 시작해보세요.</p>
            ) : (
              recent.map((r) => (
                <button key={r.key} onClick={() => nav("history")} className="w-full text-left p-4 flex items-center gap-4 hover:bg-surface-container-low transition-colors group relative">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary scale-y-0 group-hover:scale-y-100 transition-transform origin-center" />
                  <div className={"w-10 h-10 rounded-full flex items-center justify-center shrink-0 " + r.wrap}>
                    <span className="material-symbols-outlined text-[16px]">{r.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-body-md text-body-md font-bold text-on-surface truncate">{r.title}</h4>
                    <p className="text-sm text-on-surface-variant">{r.mode} • {r.done ? "완료" : "연습 필요"}</p>
                  </div>
                  <div className="text-right">
                    <p className={"font-stats-number text-stats-number " + (r.done ? "text-tertiary" : "text-progress-orange")}>{r.total}점</p>
                    <p className="text-xs text-slate-muted">종합 점수</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </section>
    </DashboardLayout>
  );
}
