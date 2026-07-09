/**
 * Generic content container following the Briefly Core card pattern:
 * radius-xl, white surface, 1px outline-variant border, stack-lg padding.
 * See .claude/skills/design/SKILL.md section 3 for the full rule set.
 */
export default function Card({ children, style, ...props }) {
  return (
    <div
      style={{
        background: "var(--color-surface-container-lowest)",
        border: "1px solid var(--color-outline-variant)",
        borderRadius: "var(--radius-xl)",
        padding: "var(--space-stack-lg)",
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  )
}
