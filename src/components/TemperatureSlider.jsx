import { Snowflake, Zap, Flame } from "lucide-react";
import { getTempColor, getTempLabel } from "../utils/temperature";

const TONE_PREVIEWS = [
  { range: "0–30°", label: "감성 일기", color: "#4FC3F7", isActive: (t) => t <= 30 },
  { range: "31–79°", label: "균형 유머", color: "#FFB020", isActive: (t) => t > 30 && t < 80 },
  { range: "80–100°", label: "매운 풍자", color: "#FF4D1F", isActive: (t) => t >= 80 },
];

export function TemperatureSlider({ value, onChange }) {
  const tempColor = getTempColor(value);
  const tempLabel = getTempLabel(value);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="text-xs font-mono text-muted-foreground uppercase tracking-wider flex items-center">
          감정 온도
          <span
            className="text-xs font-sans font-normal px-2 py-0.5 rounded-full ml-1 transition-all duration-200"
            style={{ background: `${tempColor}15`, color: tempColor, border: `1px solid ${tempColor}30` }}
          >
            {tempLabel}
          </span>
        </div>
      </div>

      <div className="relative">
        <div
          className="h-1.5 w-full rounded-full mb-3"
          style={{ background: "linear-gradient(to right, #4FC3F7 0%, #FFB020 55%, #FF4D1F 100%)" }}
        />
        <input
          type="range"
          min={0}
          max={100}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute top-0 w-full opacity-0 cursor-pointer h-1.5"
          style={{ accentColor: tempColor }}
        />
        <div
          className="absolute -top-0.5 w-4 h-4 rounded-full border-2 border-background shadow-lg transition-colors duration-200 pointer-events-none"
          style={{ left: `calc(${value}% - 8px)`, background: tempColor }}
        />
      </div>

      <div className="flex justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Snowflake size={10} style={{ color: "#4FC3F7" }} /> 0° 잔잔
        </span>
        <span className="flex items-center gap-1">
          50° 균형 <Zap size={10} style={{ color: "#FFB020" }} />
        </span>
        <span className="flex items-center gap-1">
          100° 매운맛 <Flame size={10} style={{ color: "#FF4D1F" }} />
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-1">
        {TONE_PREVIEWS.map((tone) => {
          const active = tone.isActive(value);
          return (
            <div
              key={tone.range}
              className="py-2 px-3 rounded-lg border text-center transition-all"
              style={{
                borderColor: active ? `${tone.color}50` : "var(--border)",
                background: active ? `${tone.color}10` : "transparent",
              }}
            >
              <div
                className="text-xs font-mono mb-0.5"
                style={{ color: active ? tone.color : "var(--muted-foreground)" }}
              >
                {tone.range}
              </div>
              <div className="text-xs" style={{ color: active ? tone.color : "var(--muted-foreground)" }}>
                {tone.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
