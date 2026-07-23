import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { FitMeter } from "@/components/ui/FitMeter";
import { fitLabel, fitTone } from "@/lib/fit";
import type { Position } from "@/lib/types";

const LOGO_TINT: Record<string, string> = {
  success: "bg-success-soft text-success",
  primary: "bg-primary-soft text-primary",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
};

/** 디자인.md 6.3 — 포지션 카드 (적합도 미터가 우측 고정) */
export function PositionCard({ position, rank }: { position: Position; rank: number }) {
  const tone = fitTone(position.fitScore);

  return (
    <Link
      href={`/positions/${position.id}`}
      className="flex w-full items-center gap-4 rounded-card border border-line bg-surface p-5 px-6 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-card-hover"
    >
      <span className="w-6 shrink-0 text-center text-[13px] font-bold text-muted">{rank}</span>

      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl text-sm font-bold ${LOGO_TINT[tone]}`}>
        {position.company.slice(0, 2)}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-base font-semibold text-strong">{position.title}</span>
        <span className="block text-xs text-muted">
          {position.company} · {position.location} · {position.experience}
        </span>
        <span className="mt-2 flex flex-wrap gap-1.5">
          {(position.tags ?? []).map((t) => (            <Badge key={t}>{t}</Badge>
          ))}
        </span>
      </span>

      <span className="w-[150px] shrink-0 text-right">
        <Badge tone={tone === "primary" ? "primary" : tone}>{fitLabel(position.fitScore)}</Badge>
        <span className="mt-1.5 block text-xl font-bold tracking-tight text-strong">
          {position.fitScore}%
        </span>
        <FitMeter score={position.fitScore} className="mt-1.5" />
      </span>
    </Link>
  );
}
