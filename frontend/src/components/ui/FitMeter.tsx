import { clsx } from "@/lib/clsx";
import { FILL_CLASS, fitTone } from "@/lib/fit";

/**
 * 디자인.md 5.5 — 적합도 미터 (시그니처 컴포넌트)
 * 점수만 넘기면 색상은 lib/fit.ts의 규칙이 알아서 정한다.
 */
export function FitMeter({
  score,
  className,
  /** 파란 패널처럼 어두운 배경 위에 올릴 때 */
  onDark,
  label,
}: {
  score: number;
  className?: string;
  onDark?: boolean;
  label?: string;
}) {
  const pct = Math.max(0, Math.min(100, score));

  return (
    <div
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label ?? `적합도 ${pct}%`}
      className={clsx(
        "h-2 w-full overflow-hidden rounded-badge",
        onDark ? "bg-white/30" : "bg-line",
        className,
      )}
    >
      <span
        className={clsx(
          "block h-full rounded-badge transition-[width] duration-700 ease-out",
          onDark ? "bg-white" : FILL_CLASS[fitTone(pct)],
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
