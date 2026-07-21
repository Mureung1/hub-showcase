export const CATEGORIES = ['전체', '김밥', '도시락', '주먹밥', '햄버거샌드위치'];

interface CategorySelectorProps {
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
}

export default function CategorySelector({ selectedCategory, onSelectCategory }: CategorySelectorProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
      {CATEGORIES.map((category) => {
        const active = category === selectedCategory;
        return (
          <button
            key={category}
            onClick={() => onSelectCategory(category)}
            style={{
              padding: '7px 14px',
              borderRadius: '20px',
              background: active ? '#2563EB' : '#FFFFFF',
              border: active ? 'none' : '1px solid #E2E8F0',
              color: active ? '#fff' : '#475569',
              fontSize: '13px',
              fontWeight: active ? '700' : '600',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {category}
          </button>
        );
      })}
    </div>
  );
}
