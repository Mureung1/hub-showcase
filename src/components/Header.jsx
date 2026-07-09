import { Flame, History, Bell } from "lucide-react";
import { WEATHER_NOW } from "../data/mockData";

export function Header({ showHistory, onToggleHistory }) {
  return (
    <header className="h-14 shrink-0 border-b border-border flex items-center px-5 gap-4 bg-card/60 backdrop-blur-sm">
      <div className="flex items-center gap-2 mr-4">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: "var(--primary)" }}
        >
          <Flame size={13} className="text-white" />
        </div>
        <span className="font-display font-bold text-base tracking-tight">하소AI</span>
      </div>

      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span>새 콘텐츠 만들기</span>
      </div>

      <div className="ml-auto flex items-center gap-2">
        {/* 날씨 API 연동 예정 지점 — 지금은 mockData의 고정값 표시 */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-card text-xs text-muted-foreground">
          {WEATHER_NOW.icon}
          <span>{WEATHER_NOW.label}</span>
          <span className="font-mono">{WEATHER_NOW.temp}</span>
        </div>

        <button
          onClick={onToggleHistory}
          className={`p-2 rounded-lg border transition-colors ${
            showHistory ? "border-[var(--primary)] bg-[rgba(255,77,31,0.08)]" : "border-border hover:bg-muted"
          }`}
        >
          <History size={15} className={showHistory ? "text-[var(--primary)]" : ""} />
        </button>

        <button className="p-2 rounded-lg border border-border hover:bg-muted transition-colors">
          <Bell size={15} />
        </button>

        <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold ml-1">
          김
        </div>
      </div>
    </header>
  );
}
