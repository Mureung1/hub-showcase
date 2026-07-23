"use client";
import type { ScreenKey } from "@/components/AppShell";

const ITEMS: { key: ScreenKey; icon: string; label: string; fill?: boolean }[] = [
  { key: "home", icon: "home", label: "Home" },
  { key: "history", icon: "history", label: "History" },
  { key: "stats", icon: "leaderboard", label: "Stats" },
  { key: "mail", icon: "mail", label: "Mail Mode" },
  { key: "news", icon: "newspaper", label: "News Mode" },
  { key: "chat", icon: "forum", label: "Chat Mode" },
];

export default function SideNav({ active, onNav }: { active: ScreenKey; onNav: (k: ScreenKey) => void }) {
  return (
    <aside className="hidden md:flex flex-col bg-slate-dark text-on-primary fixed left-0 top-0 h-full w-64 transition-all duration-300 shadow-xl z-50 py-6">
      <div className="px-6 mb-8 flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center font-bold text-white shadow-lg">
          <span className="material-symbols-outlined">psychology</span>
        </div>
        <div>
          <h1 className="font-headline-md text-headline-md font-bold text-white">uncoach-pi</h1>
          <p className="font-label-sm text-label-sm text-slate-muted">AI Training Platform</p>
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
                  ? "w-[calc(100%-1rem)] bg-primary text-white rounded-xl mx-2 flex items-center gap-3 px-4 py-3 shadow-md scale-95 duration-150"
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
        <button
          onClick={() => alert("업그레이드는 준비 중이에요 🙂")}
          className="w-full py-3 bg-tertiary-container text-white rounded-xl font-label-sm text-label-sm hover:bg-tertiary transition-colors shadow-md mb-6"
        >
          Upgrade to Pro
        </button>
        <nav className="space-y-2">
          <button
            onClick={() => onNav("settings")}
            className="w-[calc(100%-1rem)] text-slate-muted hover:text-white transition-colors flex items-center gap-3 px-4 py-2 mx-2 hover:bg-slate-muted/20 rounded-xl"
          >
            <span className="material-symbols-outlined">settings</span>
            <span className="font-label-sm text-label-sm">Settings</span>
          </button>
          <button
            onClick={() => alert("도움말은 준비 중이에요 🙂")}
            className="w-[calc(100%-1rem)] text-slate-muted hover:text-white transition-colors flex items-center gap-3 px-4 py-2 mx-2 hover:bg-slate-muted/20 rounded-xl"
          >
            <span className="material-symbols-outlined">help</span>
            <span className="font-label-sm text-label-sm">Help</span>
          </button>
        </nav>
      </div>
    </aside>
  );
}
