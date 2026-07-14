import { Badge } from "@/components/ui/Badge";
import { FitMeter } from "@/components/ui/FitMeter";
import { fulfillmentBadge } from "@/lib/fit";
import type { Requirement } from "@/lib/types";

/** 디자인.md 6.4 — 요구조건 분해 행: 가중치 × 충족도 = 기여 점수 */
export function RequirementRow({ req }: { req: Requirement }) {
  const status = fulfillmentBadge(req.fulfillment);
  const pct = Math.round(req.fulfillment * 100);

  return (
    <div className="flex items-center gap-3.5 border-b border-line py-3.5 last:border-b-0">
      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex flex-wrap items-center gap-2 font-semibold text-strong">
          {req.name}
          <Badge tone={req.required ? "danger" : "warning"}>{req.required ? "필수" : "우대"}</Badge>
          <Badge tone={status.tone}>{status.label}</Badge>
        </div>
        <div className="flex items-center gap-2.5 text-xs text-muted">
          <span>가중치 {req.weight.toFixed(2)}</span>
          <span aria-hidden>·</span>
          <span>{req.evidence}</span>
        </div>
      </div>

      <div className="hidden w-[180px] shrink-0 sm:block">
        <FitMeter score={pct} label={`${req.name} 충족도`} />
      </div>

      <div className="w-13 shrink-0 text-right text-sm font-bold text-strong">
        {(req.weight * req.fulfillment).toFixed(2)}
      </div>
    </div>
  );
}
