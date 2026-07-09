import "./designSelect.css";

// 2단계: DESIGN.md 테마 갤러리에서 하나를 고른다.
// 좌측은 미니 미리보기가 붙은 카드, 우측은 선택한 테마의 DESIGN.md 원문.
export default function DesignSelect({ themes, selected, onSelect }) {
  const cur = themes.find((t) => t.slug === selected) || themes[0];

  return (
    <div className="design-wrap">
      <div className="theme-cards">
        {themes.map((t) => (
          <button
            key={t.slug}
            className={`theme-card ${t.slug === selected ? "on" : ""}`}
            onClick={() => onSelect(t.slug)}
          >
            <span
              className="swatch"
              style={{ background: t.tokens.bg, borderColor: t.tokens.border }}
            >
              <span className="swatch-bar" style={{ background: t.tokens.accent }} />
              <span
                className="swatch-line lg"
                style={{ background: t.tokens.text }}
              />
              <span className="swatch-line" style={{ background: t.tokens.textMuted }} />
              <span className="swatch-dots">
                <i style={{ background: t.tokens.accent }} />
                <i style={{ background: t.tokens.accent2 }} />
              </span>
            </span>
            <span className="theme-name">
              {t.name}
              {t.isDefault && <em className="rec">추천</em>}
            </span>
            <span className="theme-vibe">{t.vibe}</span>
          </button>
        ))}
      </div>

      <aside className="design-doc">
        <div className="doc-head">
          <h3>{cur.name}</h3>
          <code>designs/{cur.slug}.md</code>
        </div>
        <p className="doc-audience">👤 {cur.audience}</p>
        <pre className="doc-md">{cur.markdown}</pre>
      </aside>
    </div>
  );
}
