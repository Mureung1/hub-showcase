// T22: 낮/밤 동기화·숲·카페 테마 토글. docs/prototype/whitenoise-themes.html의 .theme-switch 기반.
const OPTIONS = [
  { value: "daynight", label: "낮/밤 동기화" },
  { value: "forest", label: "숲" },
  { value: "cafe", label: "카페" },
];

function ThemeIcon({ value, active }) {
  const stroke = active ? "var(--ink)" : "var(--ink-faint)";
  if (value === "daynight") {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="5" stroke={stroke} strokeWidth="1.6" />
      </svg>
    );
  }
  if (value === "forest") {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
        <path
          d="M4 12c2 6 10 9 14 4-6 1-11-4-10-11-3 1-5 4-4 7z"
          stroke={stroke}
          strokeWidth="1.4"
        />
      </svg>
    );
  }
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M6 9h9a3 3 0 010 6H6z" stroke={stroke} strokeWidth="1.4" />
    </svg>
  );
}

export default function ThemeSwitcher({ theme, onChange }) {
  return (
    <div
      style={{
        display: "flex",
        gap: "6px",
        background: "var(--white)",
        border: "1px solid var(--cream-line)",
        borderRadius: "100px",
        padding: "5px",
        zIndex: 5,
      }}
    >
      {OPTIONS.map((option) => {
        const active = theme === option.value;
        return (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            aria-label={option.label}
            title={option.label}
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "50%",
              border: "none",
              background: active ? "var(--cream)" : "transparent",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <ThemeIcon value={option.value} active={active} />
          </button>
        );
      })}
    </div>
  );
}
