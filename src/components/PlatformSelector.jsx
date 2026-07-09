import { PLATFORMS } from "../data/mockData";

export function PlatformSelector({ selected, onSelect }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">발행 채널</label>
      <div className="grid grid-cols-4 gap-2">
        {PLATFORMS.map((p) => (
          <button
            key={p.id}
            onClick={() => onSelect(p.id)}
            className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border text-xs transition-all ${
              selected === p.id
                ? "text-foreground"
                : "border-border text-muted-foreground hover:border-[rgba(255,255,255,0.14)]"
            }`}
            style={
              selected === p.id
                ? { borderColor: "var(--primary)", background: "rgba(255,77,31,0.07)" }
                : {}
            }
          >
            <span className="text-base">{p.icon}</span>
            <span className="leading-none">{p.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
