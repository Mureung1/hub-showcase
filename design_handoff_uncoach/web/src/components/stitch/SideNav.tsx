"use client";
import type { ScreenKey } from "@/components/AppShell";

const ITEMS: { key: ScreenKey; icon: string; label: string; fill?: boolean }[] = [
  { key: "home", icon: "home", label: "홈" },
  { key: "history", icon: "history", label: "학습 기록" },
  { key: "stats", icon: "leaderboard", label: "통계" },
];

/** 모바일 하단 탭도 같은 목록을 쓴다(설정 포함). */
export const NAV_ITEMS: { key: ScreenKey; icon: string; label: string }[] = [
  ...ITEMS,
  { key: "settings", icon: "settings", label: "설정" },
];

export default function SideNav({ active, onNav }: { active: ScreenKey; onNav: (k: ScreenKey) => void }) {
  return (
    <aside className="hidden md:flex flex-col bg-slate-dark text-on-primary fixed left-0 top-0 h-full w-64 transition-all duration-300 shadow-pop z-50 py-6">
      <div className="px-6 mb-8 flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center font-bold text-white shadow-pop">
          <span className="material-symbols-outlined">psychology</span>
        </div>
        <div>
          <h1 className="font-headline-md text-headline-md text-white">언코</h1>
          <p className="font-label-sm text-label-sm text-slate-muted">AI 소통 훈련 플랫폼</p>
        </div>
      </div>
      <nav className="flex-1 px-2 space-y-2">
        {ITEMS.map((it) => {
          const on = active === it.key;
          return (
            <button
              key={it.key}
              onClick={() => onNav(it.key)}
              className={
                on
                  ? "w-[calc(100%-1rem)] bg-primary text-white rounded-xl mx-2 flex items-center gap-3 px-4 py-3 shadow-card scale-95 duration-150"
                  : "w-[calc(100%-1rem)] text-slate-muted hover:text-white transition-colors flex items-center gap-3 px-4 py-3 mx-2 hover:bg-slate-muted/20 rounded-xl"
              }
            >
              <span className="material-symbols-outlined" style={on ? { fontVariationSettings: "'FILL' 1" } : undefined}>
                {it.icon}
              </span>
              <span className="font-label-sm text-label-sm">{it.label}</span>
            </button>
          );
        })}
      </nav>
      <div className="mt-auto px-4">
        <nav className="space-y-2">
          <button
            onClick={() => onNav("settings")}
            className="w-[calc(100%-1rem)] text-slate-muted hover:text-white transition-colors flex items-center gap-3 px-4 py-2 mx-2 hover:bg-slate-muted/20 rounded-xl"
          >
            <span className="material-symbols-outlined">settings</span>
            <span className="font-label-sm text-label-sm">설정</span>
          </button>
        </nav>
      </div>
    </aside>
  );
}
