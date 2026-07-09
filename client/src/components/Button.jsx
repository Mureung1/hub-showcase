/**
 * Primary/secondary CTA button following the Briefly Core button pattern.
 * See .claude/skills/design/SKILL.md section 4.
 */
export default function Button({ variant = "primary", children, style, ...props }) {
  const isSecondary = variant === "secondary"

  return (
    <button
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        width: "100%",
        padding: "16px",
        border: "none",
        borderRadius: "var(--radius-md)",
        cursor: "pointer",
        fontFamily: "var(--font-display)",
        fontSize: "var(--headline-sm-size)",
        fontWeight: "var(--headline-sm-weight)",
        background: isSecondary ? "var(--color-surface-container-low)" : "var(--color-primary)",
        color: isSecondary ? "var(--color-primary)" : "var(--color-on-primary)",
        ...style,
      }}
      {...props}
    >
      {children}
    </button>
  )
}
