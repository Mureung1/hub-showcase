import type { Category } from '../../types/analysis';
import { CATEGORIES } from '../../constants/analysisMockData';

interface CategoryTabsProps {
  selectedCategory: Category;
  onSelectCategory: (category: Category) => void;
  badges: Partial<Record<Category, '추천' | '주의'>>;
}

export default function CategoryTabs({ selectedCategory, onSelectCategory, badges }: CategoryTabsProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
      {CATEGORIES.map((category) => {
        const active = category === selectedCategory;
        const badge = badges[category];
        const badgeIsRisk = badge === '주의';
        const badgeColor = active ? '#fff' : badgeIsRisk ? '#DC2626' : '#1D4ED8';

        return (
          <button
            key={category}
            onClick={() => onSelectCategory(category)}
            style={{
              padding: '9px 18px',
              borderRadius: '20px',
              background: active ? '#2563EB' : '#FFFFFF',
              border: active ? 'none' : '1px solid #E2E8F0',
              color: active ? '#fff' : '#475569',
              fontSize: '13px',
              fontWeight: active ? '700' : '600',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            {category}
            {badge && (
              <span style={{ fontSize: '12px', fontWeight: '700', color: badgeColor }}>
                &nbsp;({badge})
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
