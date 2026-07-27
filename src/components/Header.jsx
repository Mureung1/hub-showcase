import { Flame, History, Bell, Store } from "lucide-react";

export function Header({ showHistory, onToggleHistory, businessProfile, onOpenProfile }) {
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

      <button
        onClick={onOpenProfile}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border text-xs text-muted-foreground hover:text-foreground hover:border-[rgba(255,255,255,0.14)] transition-colors"
      >
        <Store size={11} />
        {businessProfile?.name ? businessProfile.name : "내 업장 정보 등록하기"}
      </button>

      <div className="ml-auto flex items-center gap-2">
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
      </div>
    </header>
  );
}
