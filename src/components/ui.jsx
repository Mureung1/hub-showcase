export function Button({ children, className = "", variant = "primary", ...props }) {
  return (
    <button className={`ui-button ui-button--${variant} ${className}`.trim()} {...props}>
      {children}
    </button>
  );
}

export function Card({ children, className = "", ...props }) {
  return (
    <section className={`ui-card ${className}`.trim()} {...props}>
      {children}
    </section>
  );
}

export function Badge({ children, className = "", tone = "verified" }) {
  return <span className={`ui-badge ui-badge--${tone} ${className}`.trim()}>{children}</span>;
}

export function SearchField({ onSubmit, value, onChange }) {
  return (
    <form className="ui-search" onSubmit={onSubmit}>
      <span className="ui-search__brand" aria-hidden="true">H</span>
      <label>
        <span>카카오맵 장소 검색</span>
        <input
          value={value}
          onChange={onChange}
          placeholder="문래동 맛집, 강남역 카페"
        />
      </label>
      <Button type="submit">검색</Button>
    </form>
  );
}

export function Tabs({ items, onChange, value }) {
  return (
    <nav className="ui-tabs" aria-label="업종 필터">
      {items.map((item) => (
        <Button
          className={value === item.query ? "is-active" : ""}
          key={item.query}
          onClick={() => onChange(item.query)}
          type="button"
          variant="tab"
        >
          {item.label}
        </Button>
      ))}
    </nav>
  );
}
