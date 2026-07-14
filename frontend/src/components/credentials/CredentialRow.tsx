import { Badge } from "@/components/ui/Badge";
import type { Credential, CredentialType } from "@/lib/types";

const ICON: Record<CredentialType, { emoji: string; tint: string }> = {
  career: { emoji: "💼", tint: "bg-primary-soft text-primary" },
  certificate: { emoji: "🎓", tint: "bg-success-soft text-success" },
  portfolio: { emoji: "🔗", tint: "bg-info-soft text-info" },
  company: { emoji: "🏢", tint: "bg-warning-soft text-warning" },
};

export function CredentialRow({ credential }: { credential: Credential }) {
  const icon = ICON[credential.type];
  const isCurrent = credential.status === "재직 중" || credential.status === "보유";

  return (
    <div className="mb-2.5 flex items-center gap-3 rounded-xl border border-line bg-surface p-3.5">
      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-[10px] text-[15px] ${icon.tint}`}>
        {icon.emoji}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate font-semibold text-strong">{credential.title}</div>
        <div className="truncate text-xs text-muted">{credential.detail}</div>
      </div>
      {credential.status && (
        <Badge tone={isCurrent ? "success" : "muted"}>{credential.status}</Badge>
      )}
    </div>
  );
}
