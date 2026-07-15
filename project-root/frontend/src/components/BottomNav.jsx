// components/BottomNav.jsx
import "./BottomNav.css";

const ICONS = {
  home: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11l9-8 9 8" />
      <path d="M5 10v10a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V10" />
    </svg>
  ),
  preference: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 4h6M4 4h1M4 20h1M9 20h6M19 4h1M19 20h1M4 12h16" />
      <circle cx="9" cy="4" r="2" />
      <circle cx="15" cy="12" r="2" />
      <circle cx="9" cy="20" r="2" />
    </svg>
  ),
  calendar: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  ),
};

const DEFAULT_ITEMS = [
  { key: "home", label: "홈" },
  { key: "preference", label: "추천" },
  { key: "calendar", label: "내 시간표" },
];

export default function BottomNav({ items = DEFAULT_ITEMS, activeKey, onChange }) {
  return (
    <nav className="bottom-nav">
      {items.map((item) => {
        const isActive = item.key === activeKey;
        return (
          <button
            key={item.key}
            type="button"
            className={`bottom-nav__item${isActive ? " bottom-nav__item--active" : ""}`}
            onClick={() => onChange?.(item.key)}
          >
            {ICONS[item.key]}
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
