export type Tab = "in" | "stock" | "expiry";

interface TabBarProps {
  tab: Tab;
  onChange: (tab: Tab) => void;
}

const TABS: { key: Tab; label: string }[] = [
  { key: "in", label: "입고" },
  { key: "stock", label: "재고" },
  { key: "expiry", label: "유통기한" },
];

// 뷰 전환 탭바(디자인 공통 크롬). 활성 = 브랜드 그린 텍스트 + 하단 3px 밑줄.
export function TabBar({ tab, onChange }: TabBarProps) {
  return (
    <nav className="tabbar" role="tablist" aria-label="화면">
      {TABS.map((t) => (
        <button
          key={t.key}
          type="button"
          role="tab"
          aria-selected={tab === t.key}
          className={`tabbar__tab${tab === t.key ? " is-active" : ""}`}
          onClick={() => onChange(t.key)}
        >
          {t.label}
        </button>
      ))}
    </nav>
  );
}
