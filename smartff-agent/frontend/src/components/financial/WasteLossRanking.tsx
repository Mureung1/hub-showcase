interface WasteLossRankingProps {
  data: any[];
  totalWaste: number;
}

export default function WasteLossRanking({ data, totalWaste }: WasteLossRankingProps) {
  const categoryMap = new Map<string, { waste: number; rate: number }>();

  data.forEach((record) => {
    const key = record.category;
    if (!categoryMap.has(key)) {
      categoryMap.set(key, { waste: 0, rate: 0 });
    }
    const current = categoryMap.get(key)!;
    current.waste += record.waste_amount;
    current.rate = (current.waste / record.sales_amount) * 100;
  });

  const ranking = Array.from(categoryMap.entries())
    .map(([category, { waste, rate }]) => ({
      category,
      waste,
      percentage: ((waste / totalWaste) * 100).toFixed(1),
      rate: rate.toFixed(1),
    }))
    .sort((a, b) => b.waste - a.waste);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
      {/* Ranking */}
      <div style={{
        background: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: '12px',
        padding: '20px',
      }}>
        <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#0F172A', margin: '0 0 16px 0' }}>
          폐기손실액 랭킹
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {ranking.map((item, idx) => (
            <div key={item.category} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: idx < ranking.length - 1 ? '1px solid #E2E8F0' : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ fontSize: '16px', fontWeight: '700', color: '#2563EB', width: '24px' }}>
                  {idx + 1}
                </div>
                <div>
                  <p style={{ fontSize: '13px', fontWeight: '600', color: '#0F172A', margin: '0' }}>
                    {item.category}
                  </p>
                  <p style={{ fontSize: '12px', color: '#94A3B8', margin: '2px 0 0 0' }}>
                    전체 폐기의 {item.percentage}%
                  </p>
                </div>
              </div>
              <div style={{ fontSize: '14px', fontWeight: '700', color: '#DC2626' }}>
                {(item.waste / 1000000).toFixed(1)}M
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Waste Rate Progress Bars */}
      <div style={{
        background: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: '12px',
        padding: '20px',
      }}>
        <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#0F172A', margin: '0 0 16px 0' }}>
          폐기율 (금액 기준)
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {ranking.map((item) => (
            <div key={item.category}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <p style={{ fontSize: '13px', fontWeight: '600', color: '#0F172A', margin: '0' }}>
                  {item.category}
                </p>
                <p style={{ fontSize: '13px', fontWeight: '700', color: '#0F172A', margin: '0' }}>
                  {item.rate}%
                </p>
              </div>
              <div style={{ background: '#F1F5F9', borderRadius: '4px', height: '8px', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    background: parseFloat(item.rate) > 15 ? '#DC2626' : '#2563EB',
                    width: `${parseFloat(item.rate) * 3}px`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
