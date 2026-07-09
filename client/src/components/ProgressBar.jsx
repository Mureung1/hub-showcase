/**
 * Screen-level progress indicator: label + fraction + thin filled track.
 * See .claude/skills/design/SKILL.md section 6 ("상단 진행 표시").
 */
export default function ProgressBar({ label, current, total }) {
  const percent = Math.min(100, Math.max(0, (current / total) * 100))

  return (
    <div style={{ padding: "var(--space-stack-sm) var(--space-margin-mobile) 0" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          marginBottom: "var(--space-stack-sm)",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-body)",
            fontSize: "var(--label-md-size)",
            fontWeight: "var(--label-md-weight)",
            color: "var(--color-secondary)",
          }}
        >
          {label}
        </span>
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "var(--headline-sm-size)",
            fontWeight: "var(--headline-sm-weight)",
            color: "var(--color-primary)",
          }}
        >
          {current}/{total}
        </span>
      </div>
      <div
        style={{
          height: "6px",
          width: "100%",
          background: "var(--color-surface-container-highest)",
          borderRadius: "var(--radius-full)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${percent}%`,
            background: "var(--color-primary)",
            borderRadius: "var(--radius-full)",
            transition: "width 0.6s ease",
          }}
        />
      </div>
    </div>
  )
}
