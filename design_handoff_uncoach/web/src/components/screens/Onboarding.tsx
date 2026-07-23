"use client";
import { useState } from "react";
import { useApp } from "@/lib/client/store";

const PERIODS = ["1주일 전", "1개월 전", "3개월 전", "6개월 전"];

export default function Onboarding({ onDone }: { onDone: () => void }) {
  const app = useApp();
  const [type, setType] = useState<"정기 훈련" | "집중 훈련">("정기 훈련");
  const [period, setPeriod] = useState("1개월 전");
  const [hours, setHours] = useState("");

  function save() {
    app.saveProfile({ role: "", goal: `${type} · 목표 ${hours || "미설정"}시간` });
    onDone();
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* 상단 네비 */}
      <nav className="flex justify-between items-center w-full px-margin-page h-16 z-50 bg-surface-container-lowest shadow-sm">
        <div className="flex items-center gap-stack-lg">
          <div className="text-headline-md font-headline-md font-bold text-primary">Uncoach-Pi</div>
          <div className="hidden md:flex gap-stack-md">
            {["Training", "Insights", "Lounge", "About"].map((t) => (
              <a key={t} className="text-on-surface-variant hover:text-primary hover:bg-surface-container-low transition-colors font-body-md text-body-md px-3 py-2 rounded-md" href="#">
                {t}
              </a>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-stack-md">
          <button className="text-primary hover:bg-surface-container-low transition-colors p-2 rounded-full">
            <span className="material-symbols-outlined">language</span>
          </button>
          <button className="text-primary p-2 rounded-full bg-surface-container-low">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
          </button>
          <button className="text-primary hover:bg-surface-container-low transition-colors p-2 rounded-full">
            <span className="material-symbols-outlined">search</span>
          </button>
        </div>
      </nav>

      <main className="flex-grow flex flex-col relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
          <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-primary-fixed opacity-20 blur-[100px]" />
          <div className="absolute top-[60%] -right-[10%] w-[40%] h-[60%] rounded-full bg-secondary-fixed opacity-20 blur-[120px]" />
        </div>
        <div className="relative z-10 w-full max-w-6xl mx-auto px-margin-page pt-12 pb-32 flex flex-col items-center">
          <div className="w-full flex justify-end text-label-sm font-label-sm text-outline mb-8">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px]">home</span>
              <span>&gt;</span>
              <span>프로필</span>
              <span>&gt;</span>
              <span className="text-on-surface">기본 정보 설정</span>
            </div>
          </div>

          {/* 스텝 */}
          <div className="flex items-center gap-4 mb-8">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-on-primary font-stats-number text-stats-number">1</div>
            <div className="w-12 h-[2px] bg-outline-variant" />
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-surface-container-high text-outline font-stats-number text-stats-number">2</div>
            <div className="w-12 h-[2px] bg-outline-variant" />
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-surface-container-high text-outline font-stats-number text-stats-number">3</div>
          </div>

          <h1 className="font-headline-lg text-headline-lg md:font-display-lg md:text-display-lg text-on-surface text-center mb-12">
            성장을 위한 기본 정보를 입력해 주세요
          </h1>

          <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-gutter-grid max-w-4xl">
            {/* 훈련 유형 */}
            <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-border-light p-padding-card flex flex-col gap-stack-md">
              <h2 className="font-headline-md text-headline-md text-on-surface mb-2">훈련 유형</h2>
              {(["정기 훈련", "집중 훈련"] as const).map((t) => {
                const on = type === t;
                return (
                  <label
                    key={t}
                    onClick={() => setType(t)}
                    className={
                      "relative flex items-start gap-4 p-4 rounded-lg cursor-pointer transition-all hover:bg-surface-container-low " +
                      (on ? "border-2 border-primary bg-surface" : "border border-outline-variant bg-surface-container-lowest hover:border-outline")
                    }
                  >
                    <input checked={on} readOnly className="mt-1 h-5 w-5 accent-[var(--color-primary)]" name="training_type" type="radio" />
                    <div className="flex flex-col">
                      <span className="font-headline-md text-body-lg text-on-surface font-semibold mb-1">{t}</span>
                      <span className="font-body-md text-body-md text-on-surface-variant">
                        {t === "정기 훈련" ? "매일 꾸준한 성장에 집중하고 싶어요." : "단기간 내 빠른 기술 향상을 원해요."}
                      </span>
                    </div>
                  </label>
                );
              })}
            </div>

            {/* 시작일 + 목표 시간 */}
            <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-border-light p-padding-card flex flex-col gap-stack-md">
              <h2 className="font-headline-md text-headline-md text-on-surface mb-2">훈련 시작일</h2>
              <div className="relative w-full mb-4">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-outline">
                  <span className="material-symbols-outlined">calendar_today</span>
                </div>
                <input className="block w-full pl-10 pr-10 py-3 text-body-lg font-body-lg bg-surface border border-outline-variant rounded-lg text-on-surface" readOnly type="text" value="2024.10.24" />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-outline">
                  <span className="material-symbols-outlined">expand_more</span>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2 mb-6">
                {PERIODS.map((p) => {
                  const on = period === p;
                  return (
                    <button
                      key={p}
                      onClick={() => setPeriod(p)}
                      className={
                        "py-2 px-1 text-label-sm font-label-sm rounded-md border transition-colors " +
                        (on ? "text-primary bg-primary-fixed border-primary font-semibold" : "text-on-surface-variant bg-surface-container border-outline-variant hover:bg-surface-container-high")
                      }
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
              <div className="text-body-md text-label-sm text-slate-muted mb-8 space-y-2">
                <p>• 오늘 이전 날짜만 선택 가능하며, 기간 선택 버튼을 클릭하시면 설정된 날짜를 빠르게 입력할 수 있습니다.</p>
                <p>• 선택한 기간 동안의 이전 데이터를 기반으로 초기 목표가 설정됩니다.</p>
              </div>
              <h2 className="font-headline-md text-headline-md text-on-surface mb-2 border-t border-border-light pt-6">훈련 목표 시간</h2>
              <input
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                className="block w-full px-4 py-3 text-body-lg font-body-lg bg-surface border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:outline-none text-on-surface"
                placeholder="목표 시간 (시간) 입력"
                type="number"
              />
            </div>
          </div>
        </div>
      </main>

      {/* 하단 요약 바 */}
      <div className="fixed bottom-0 w-full bg-surface-container-lowest border-t border-border-light shadow-[0_-4px_20px_rgba(15,23,42,0.05)] z-40">
        <div className="max-w-6xl mx-auto px-margin-page py-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex flex-col md:flex-row gap-4 md:gap-8 text-body-md font-body-md text-on-surface">
            <div className="flex flex-col">
              <span className="text-label-sm font-label-sm text-slate-muted">훈련 유형</span>
              <span className="font-semibold">{type}</span>
            </div>
            <div className="hidden md:block w-[1px] h-8 bg-outline-variant" />
            <div className="flex flex-col">
              <span className="text-label-sm font-label-sm text-slate-muted">훈련 기간</span>
              <span className="font-semibold">{period} ~ 현재</span>
            </div>
            <div className="hidden md:block w-[1px] h-8 bg-outline-variant" />
            <div className="flex flex-col">
              <span className="text-label-sm font-label-sm text-slate-muted">목표 시간</span>
              <span className="font-semibold text-primary">{hours ? `${hours}시간` : "미설정"}</span>
            </div>
          </div>
          <button
            onClick={save}
            className="w-full md:w-auto h-[44px] px-8 bg-primary text-on-primary font-headline-md text-body-lg font-semibold rounded-lg hover:bg-surface-tint transition-colors shadow-sm whitespace-nowrap"
          >
            다음으로
          </button>
        </div>
      </div>
    </div>
  );
}
