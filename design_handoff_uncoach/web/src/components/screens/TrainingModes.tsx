"use client";
import { useApp } from "@/lib/client/store";
import { getSituation, totalOf } from "@/lib/domain/situations";
import DashboardLayout from "@/components/stitch/DashboardLayout";
import type { ScreenKey } from "@/components/AppShell";

export default function TrainingModes({ nav }: { nav: (k: ScreenKey) => void }) {
  const app = useApp();
  const recent = app.history.slice(-3).reverse().map((h) => ({ h, sit: getSituation(h.sid, app.customSits), total: totalOf(h.scores) }));

  return (
    <DashboardLayout active="training" name={app.profile?.role || "Profile"} nav={nav}>
      <div className="mb-10">
        <h2 className="font-headline-lg text-headline-lg font-bold text-on-surface mb-2">원하는 훈련 방식을 선택하세요</h2>
        <p className="font-body-lg text-body-lg text-on-surface-variant">Choose your focus area to start training with uncoach-pi today.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter-grid">
        {/* 대화 훈련 */}
        <div className="bg-surface-container-lowest rounded-xl shadow-[0_4px_20px_rgba(15,23,42,0.05)] border border-border-light/50 p-padding-card flex flex-col group hover:shadow-[0_8px_30px_rgba(70,72,212,0.1)] hover:border-primary/20 transition-all duration-300">
          <div className="flex justify-between items-start mb-6">
            <div className="w-14 h-14 rounded-2xl bg-chat-bg-user text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-3xl">forum</span>
            </div>
            <span className="bg-surface-container py-1 px-3 rounded-full font-label-sm text-label-sm text-on-surface-variant">Popular</span>
          </div>
          <h3 className="font-headline-md text-headline-md font-bold text-on-surface mb-3">대화 훈련</h3>
          <p className="font-body-md text-body-md text-on-surface-variant mb-8 flex-1">상대·관계에 맞춰 실시간으로 주고받는 메시지를 연습하고 즉각적인 피드백을 받습니다.</p>
          <div className="flex items-center justify-between border-t border-border-light pt-4">
            <div className="flex -space-x-2">
              <div className="w-8 h-8 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-xs font-bold text-slate-600">A</div>
              <div className="w-8 h-8 rounded-full bg-slate-300 border-2 border-white flex items-center justify-center text-xs font-bold text-slate-600">B</div>
              <div className="w-8 h-8 rounded-full bg-surface-container-high border-2 border-white flex items-center justify-center text-xs font-bold text-on-surface-variant">+2k</div>
            </div>
            <button onClick={() => nav("chat")} className="bg-primary text-white font-label-sm text-label-sm font-bold px-6 py-3 rounded-lg hover:bg-primary-container transition-colors shadow-sm">Start</button>
          </div>
        </div>

        {/* 뉴스 요약 훈련 */}
        <div className="bg-surface-container-lowest rounded-xl shadow-[0_4px_20px_rgba(15,23,42,0.05)] border border-border-light/50 p-padding-card flex flex-col group hover:shadow-[0_8px_30px_rgba(70,72,212,0.1)] hover:border-primary/20 transition-all duration-300">
          <div className="flex justify-between items-start mb-6">
            <div className="w-14 h-14 rounded-2xl bg-tertiary-container/10 text-tertiary flex items-center justify-center group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-3xl">newspaper</span>
            </div>
          </div>
          <h3 className="font-headline-md text-headline-md font-bold text-on-surface mb-3">뉴스 요약 훈련</h3>
          <p className="font-body-md text-body-md text-on-surface-variant mb-8 flex-1">복잡한 기사를 읽고 핵심을 간결하게 요약하는 연습으로 이해력과 정보 추출 능력을 키웁니다.</p>
          <div className="flex items-center justify-between border-t border-border-light pt-4 mt-auto">
            <div className="text-sm text-on-surface-variant flex items-center gap-1"><span className="material-symbols-outlined text-sm">schedule</span><span>15 min / session</span></div>
            <button onClick={() => nav("news")} className="bg-primary text-white font-label-sm text-label-sm font-bold px-6 py-3 rounded-lg hover:bg-primary-container transition-colors shadow-sm">Start</button>
          </div>
        </div>

        {/* 메일 훈련 */}
        <div className="bg-surface-container-lowest rounded-xl shadow-[0_4px_20px_rgba(15,23,42,0.05)] border border-border-light/50 p-padding-card flex flex-col group hover:shadow-[0_8px_30px_rgba(70,72,212,0.1)] hover:border-primary/20 transition-all duration-300">
          <div className="flex justify-between items-start mb-6">
            <div className="w-14 h-14 rounded-2xl bg-secondary-container/30 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-3xl">mail</span>
            </div>
            <span className="bg-surface-container py-1 px-3 rounded-full font-label-sm text-label-sm text-on-surface-variant flex items-center gap-1">
              <span className="material-symbols-outlined text-xs text-progress-orange">star</span> Recommended
            </span>
          </div>
          <h3 className="font-headline-md text-headline-md font-bold text-on-surface mb-3">메일 훈련</h3>
          <p className="font-body-md text-body-md text-on-surface-variant mb-8 flex-1">정중하고 정확한 비즈니스 이메일을 쓰며 어조·명확성·구조를 익힙니다.</p>
          <div className="flex items-center justify-between border-t border-border-light pt-4 mt-auto">
            <div className="w-full bg-surface-container-high rounded-full h-2 mr-4 overflow-hidden"><div className="bg-tertiary h-2 rounded-full" style={{ width: "45%" }} /></div>
            <span className="text-xs font-bold text-tertiary whitespace-nowrap">Level 2</span>
          </div>
          <div className="flex justify-end mt-4">
            <button onClick={() => nav("mail")} className="bg-primary text-white font-label-sm text-label-sm font-bold px-6 py-3 rounded-lg hover:bg-primary-container transition-colors shadow-sm w-full sm:w-auto">Start</button>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <section className="mt-12">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-headline-md text-headline-md font-bold text-on-surface">Recent Activity</h3>
          <button onClick={() => nav("history")} className="font-label-sm text-label-sm text-primary hover:underline flex items-center gap-1">View All <span className="material-symbols-outlined text-sm">arrow_forward</span></button>
        </div>
        <div className="bg-surface-container-lowest rounded-xl shadow-[0_4px_20px_rgba(15,23,42,0.05)] border border-border-light/50 overflow-hidden">
          {recent.length === 0 ? (
            <div className="p-8 text-center text-on-surface-variant text-sm">아직 기록이 없어요. 위에서 훈련을 시작해보세요.</div>
          ) : (
            <div className="divide-y divide-border-light">
              {recent.map(({ h, sit, total }, i) => {
                const done = total >= 80;
                return (
                  <div key={i} className="p-4 flex items-center gap-4 hover:bg-surface-container-low transition-colors">
                    <div className="w-10 h-10 rounded-full bg-chat-bg-user text-primary flex items-center justify-center shrink-0"><span className="material-symbols-outlined text-sm">forum</span></div>
                    <div className="flex-1">
                      <h4 className="font-body-md text-body-md font-bold text-on-surface">{sit?.title || h.sid}</h4>
                      <p className="text-sm text-on-surface-variant">대화 훈련 • {done ? "Completed" : "In Progress"}</p>
                    </div>
                    <div className="text-right">
                      <p className={"font-stats-number text-stats-number " + (done ? "text-tertiary" : "text-progress-orange")}>{total}%</p>
                      <p className="text-xs text-slate-muted">Score</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </DashboardLayout>
  );
}
