import { ReactNode } from "react";

type StatusNoticeVariant = "empty" | "loading" | "error" | "info";

type StatusNoticeProps = {
  title: string;
  description?: string;
  variant?: StatusNoticeVariant;
  action?: ReactNode;
  className?: string;
};

export function StatusNotice({
  action,
  className = "",
  description,
  title,
  variant = "empty"
}: StatusNoticeProps) {
  const role = variant === "error" ? "alert" : "status";
  const classNames = ["empty-state", "status-notice", `status-notice-${variant}`, className]
    .filter(Boolean)
    .join(" ");

  return (
    <div aria-live="polite" className={classNames} role={role}>
      <span className="status-notice-icon" aria-hidden="true" />
      <div className="status-notice-copy">
        <strong>{title}</strong>
        {description ? <span>{description}</span> : null}
        {action ? <div className="status-notice-action">{action}</div> : null}
      </div>
    </div>
  );
}
