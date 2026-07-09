/**
 * AiRPort logo — wordmark + icon, built from the project's design tokens
 * (--color-primary, --color-text-primary, --color-text-tertiary, --radius-panel).
 *
 * Usage:
 *   <Logo />                     // full lockup (icon + wordmark)
 *   <Logo variant="wordmark" />  // text only, e.g. nav bar
 *   <Logo variant="icon" />      // square mark only, e.g. favicon / avatar
 *   <Logo size={32} />           // scales the whole lockup
 */
export default function Logo({ variant = "full", size = 40, className = "" }) {
  const iconMark = (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "var(--radius-panel, 16px)",
        background:
          "linear-gradient(135deg, var(--color-primary, #0A84FF), var(--color-primary-muted, #5B7B9C))",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
      aria-hidden={variant === "full"}
      role={variant === "icon" ? "img" : undefined}
      aria-label={variant === "icon" ? "AiRPort" : undefined}
    >
      <svg width="60%" height="60%" viewBox="0 0 128 128">
        <path
          d="M 32 92 A 46 46 0 0 1 92 32"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="8"
          strokeLinecap="round"
          opacity="0.5"
        />
        <path
          d="M 42 82 A 32 32 0 0 1 82 42"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="8"
          strokeLinecap="round"
          opacity="0.85"
        />
      </svg>
    </div>
  );

  const wordmarkFontSize = size * 0.85;

  const wordmark = (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        fontSize: wordmarkFontSize,
        lineHeight: 1,
      }}
    >
      {/* "Ai" — smaller folder shape, letters centered inside, bolder weight */}
      <span
        style={{
          position: "relative",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: wordmarkFontSize * 1.6,
          height: wordmarkFontSize * 1.34,
          marginRight: 4,
          color: "var(--color-text-on-primary, #fff)",
          fontFamily:
            "var(--font-family-base, -apple-system, 'SF Pro Display', 'Pretendard', 'Inter', sans-serif)",
          fontWeight: 900,
          letterSpacing: "-0.02em",
          WebkitTextStroke: "0.5px #fff",
        }}
      >
        <svg
          viewBox="0 0 150 125"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
          aria-hidden="true"
        >
          <path
            d="M 0 33 Q 0 17 17 17 L 46 17 Q 57 17 63 23 L 68 30 Q 74 37 83 37 L 133 37 Q 150 37 150 53 L 150 108 Q 150 125 133 125 L 17 125 Q 0 125 0 108 Z"
            fill="#6EB4F6"
          />
        </svg>
        <span style={{ position: "relative" }}>Ai</span>
      </span>

      {/* "RPort" — pixel typeface, same size as Ai */}
      <span
        style={{
          fontFamily: "'Press Start 2P', var(--font-family-pixel, monospace)",
          color: "var(--color-text-primary, #1C2733)",
        }}
      >
        RPort
      </span>
    </span>
  );

  if (variant === "icon") return <div className={className}>{iconMark}</div>;
  if (variant === "wordmark") return <div className={className}>{wordmark}</div>;

  return (
    <div
      className={className}
      style={{ display: "inline-flex", alignItems: "center", gap: 12 }}
    >
      {iconMark}
      {wordmark}
    </div>
  );
}
