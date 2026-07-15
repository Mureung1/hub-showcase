import { fitTone, FILL_CLASS } from "@/lib/fit";

/**
 * 원형 완성도 링. percentage만 넘기면 채움 길이가 자동 계산된다.
 * 색은 lib/fit.ts 규칙을 그대로 따른다 (미터와 같은 출처).
 */
export function CompletenessRing({
  percentage,
  size = 52,
  stroke = 5,
}: {
  percentage: number;
  size?: number;
  stroke?: number;
}) {
  const pct = Math.max(0, Math.min(100, percentage));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - pct / 100);
  const color = `var(--color-${fitTone(pct)})`;

  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`이력 완성도 ${pct}%`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-line)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-[13px] font-semibold text-strong">
        {pct}%
      </span>
    </div>
  );
}
