import type { FinancialRecord } from '../../types/financial';

interface ProfitContributionProps {
  data: FinancialRecord[];
}

const barColors = ['#2563EB', '#93C5FD', '#CBD5E1', '#E2E8F0'];

export default function ProfitContribution({ data }: ProfitContributionProps) {
  const categoryMap = new Map<string, number>();

  data.forEach((r) => {
    categoryMap.set(r.category, (categoryMap.get(r.category) || 0) + r.net_income);
  });

  const total = Array.from(categoryMap.values()).reduce((sum, v) => sum + v, 0);

  const ranked = Array.from(categoryMap.entries())
    .map(([category, net]) => ({ category, share: total > 0 ? (net / total) * 100 : 0 }))
    .sort((a, b) => b.share - a.share);

  return (
    <div
      style={{
        background: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: '18px',
        padding: '24px 26px',
        marginBottom: '20px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <span style={{ fontSize: '15px', fontWeight: '700', color: '#0F172A' }}>순이익 기여도</span>
        <span style={{ fontSize: '12px', color: '#94A3B8', fontWeight: '600', whiteSpace: 'nowrap' }}>
          카테고리별 추정 순이익 비중 · 최근 1개월
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {ranked.map((item, idx) => {
          const isTop = idx === 0;
          return (
            <div key={item.category}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: isTop ? '6px' : '0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '160px', flexShrink: 0 }}>
                  <span
                    style={{
                      width: '22px',
                      height: '22px',
                      borderRadius: '50%',
                      background: isTop ? '#2563EB' : '#CBD5E1',
                      color: isTop ? '#fff' : '#334155',
                      fontSize: '12px',
                      fontWeight: '800',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {idx + 1}
                  </span>
                  <span style={{ fontSize: '13px', fontWeight: '700', color: '#0F172A', whiteSpace: 'nowrap' }}>
                    {item.category}
                  </span>
                  <span
                    style={{
                      fontSize: '15px',
                      fontWeight: '800',
                      color: isTop ? '#1D4ED8' : '#334155',
                      whiteSpace: 'nowrap',
                      marginLeft: 'auto',
                    }}
                  >
                    {item.share.toFixed(0)}%
                  </span>
                </div>
                <div style={{ flex: 1, height: '14px', borderRadius: '7px', background: '#F1F5F9' }}>
                  <div
                    style={{
                      width: `${Math.max(item.share, 0)}%`,
                      height: '100%',
                      borderRadius: '7px',
                      background: barColors[Math.min(idx, barColors.length - 1)],
                    }}
                  />
                </div>
              </div>
              {isTop && (
                <div style={{ paddingLeft: '172px', fontSize: '12px', fontWeight: '700', color: '#1D4ED8' }}>
                  ↑ 전체 순이익 1위
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
