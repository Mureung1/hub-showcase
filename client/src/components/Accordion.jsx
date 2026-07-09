/**
 * Native <details>/<summary> expression-explanation block used on the
 * Sentences screen. Keep this native-element approach (no JS open-state)
 * so it stays consistent with the CSS-only interaction style validated
 * in prototype/05_sentence.html.
 */
export default function Accordion({ title, children }) {
  return (
    <details
      style={{
        marginTop: "var(--space-stack-md)",
      }}
    >
      <summary
        style={{
          cursor: "pointer",
          listStyle: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "var(--space-stack-sm) var(--space-stack-md)",
          borderRadius: "var(--radius-md)",
          background: "var(--color-surface-container-low)",
          border: "1px solid var(--color-outline-variant)",
          fontFamily: "var(--font-body)",
          fontSize: "var(--label-md-size)",
          fontWeight: 700,
          color: "var(--color-on-surface)",
        }}
      >
        {title}
      </summary>
      <div
        style={{
          marginTop: "8px",
          padding: "var(--space-stack-md)",
          borderRadius: "var(--radius-md)",
          background: "var(--color-surface-container-low)",
          fontFamily: "var(--font-body)",
          fontSize: "var(--body-md-size)",
          lineHeight: "var(--body-md-line)",
          color: "var(--color-on-surface-variant)",
        }}
      >
        {children}
      </div>
    </details>
  )
}
