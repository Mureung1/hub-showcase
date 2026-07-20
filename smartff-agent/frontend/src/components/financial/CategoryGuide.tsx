interface CategoryGuideProps {
  data: any[];
}

export default function CategoryGuide({ data }: CategoryGuideProps) {
  const categoryMap = new Map<string, { sales: number; margin: number }>();

  data.forEach((record) => {
    const key = record.category;
    if (!categoryMap.has(key)) {
      categoryMap.set(key, { sales: 0, margin: 0 });
    }
    const current = categoryMap.get(key)!;
    current.sales += record.sales_amount;
    current.margin += record.margin_amount;
  });

  const totalSales = Array.from(categoryMap.values()).reduce((sum, v) => sum + v.sales, 0);

  const guides = Array.from(categoryMap.entries())
    .map(([category, { sales, margin }]) => ({
      category,
      percentage: (sales / totalSales) * 100,
      marginAmount: margin,
    }))
    .sort((a, b) => b.percentage - a.percentage);

  return (
    <div
      style={{
        background: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '24px',
      }}
    >
      <div style={{ marginBottom: '16px' }}>
        <h3 style={{ fontSize: '12px', fontWeight: '600', color: '#475569', margin: '0 0 4px 0' }}>우선지 가이드</h3>
        <p style={{ fontSize: '11px', color: '#94A3B8', margin: '0' }}>카테고리별 매출액 기준</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {guides.map((guide, idx) => (
          <div key={idx}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <div>
                <span style={{ fontSize: '12px', fontWeight: '600', color: '#0F172A' }}>
                  {idx + 1}. {guide.category}
                </span>
              </div>
              <span style={{ fontSize: '12px', fontWeight: '600', color: '#0F172A' }}>
                {guide.percentage.toFixed(1)}%
              </span>
            </div>
            <div
              style={{
                background: '#E2E8F0',
                borderRadius: '4px',
                height: '8px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  background: '#2563EB',
                  height: '100%',
                  width: `${guide.percentage}%`,
                  borderRadius: '4px',
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
