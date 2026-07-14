import { Button } from "./Button";

/** 디자인.md 7 — 빈 화면은 행동을 권하는 자리다. */
export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="py-12 text-center">
      <p className="mb-1 font-semibold text-strong">{title}</p>
      <p className="mb-5 text-xs text-muted">{description}</p>
      {actionLabel && <Button onClick={onAction}>{actionLabel}</Button>}
    </div>
  );
}
