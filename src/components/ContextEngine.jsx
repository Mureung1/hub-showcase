import { Wind, CloudRain, Clock } from "lucide-react";
import { CONTEXT_CHIPS } from "../data/mockData";

export function ContextEngine({ active, onToggle, weatherInfo, holidayInfo, isLoadingContext }) {
  const weatherDisplay = isLoadingContext
    ? "불러오는 중..."
    : weatherInfo || "날씨 정보를 가져오지 못했어요";

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">맥락 엔진</label>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Wind size={11} />
          <span>{isLoadingContext ? "불러오는 중..." : "자동 감지 완료"}</span>
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#34D399" }} />
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-3 flex items-center gap-3 text-xs flex-wrap">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <CloudRain size={12} />
          <span>{weatherDisplay}</span>
        </div>
        <div className="w-px h-3 bg-border" />
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Clock size={12} />
          <span>{holidayInfo || "오늘은 특별한 날 아님"}</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {CONTEXT_CHIPS.map((c) => {
          const on = active.includes(c.id);
          return (
            <button
              key={c.id}
              onClick={() => onToggle(c.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs transition-all ${
                on ? "text-foreground" : "border-border text-muted-foreground hover:border-[rgba(255,255,255,0.14)]"
              }`}
              style={
                on
                  ? { borderColor: "rgba(255,176,32,0.5)", background: "rgba(255,176,32,0.1)", color: "#FFB020" }
                  : {}
              }
            >
              {c.icon} {c.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
