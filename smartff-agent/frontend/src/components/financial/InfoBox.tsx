import type { FinancialRecord } from '../../types/financial';

interface InfoBoxProps {
  data: FinancialRecord[]; // 항상 전체 카테고리 데이터 (카테고리 필터와 무관)
  selectedCategory: string;
}

export default function InfoBox({ data, selectedCategory }: InfoBoxProps) {
  const categoryMap = new Map<string, { sales: number; margin: number; waste: number; net: number; marginRateSum: number; wasteRateSum: number; count: number }>();

  data.forEach((r) => {
    if (!categoryMap.has(r.category)) {
      categoryMap.set(r.category, { sales: 0, margin: 0, waste: 0, net: 0, marginRateSum: 0, wasteRateSum: 0, count: 0 });
    }
    const c = categoryMap.get(r.category)!;
    c.sales += r.sales_amount;
    c.margin += r.margin_amount;
    c.waste += r.waste_amount;
    c.net += r.net_income;
    c.marginRateSum += r.margin_rate;
    c.wasteRateSum += r.waste_rate;
    c.count += 1;
  });

  const totalNet = Array.from(categoryMap.values()).reduce((sum, c) => sum + c.net, 0);

  const ranked = Array.from(categoryMap.entries())
    .map(([category, c]) => ({
      category,
      netShare: totalNet > 0 ? (c.net / totalNet) * 100 : 0,
      avgMarginRate: c.marginRateSum / c.count,
      avgWasteRate: c.wasteRateSum / c.count,
    }))
    .sort((a, b) => b.netShare - a.netShare);

  if (ranked.length === 0) return null;

  const isFiltered = selectedCategory !== '전체';
  const target = isFiltered
    ? ranked.find((r) => r.category === selectedCategory) ?? ranked[0]
    : ranked[0];
  const rank = ranked.findIndex((r) => r.category === target.category) + 1;

  const wasteStable = target.avgWasteRate < 15;
  const isTop = rank === 1;

  return (
    <div
      style={{
        background: '#EFF6FF',
        border: '1px solid #DBEAFE',
        borderRadius: '16px',
        padding: '22px 26px',
        marginBottom: '24px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
        <span
          style={{
            fontSize: '11px',
            fontWeight: '800',
            letterSpacing: '0.06em',
            color: '#fff',
            textTransform: 'uppercase',
            background: '#1D4ED8',
            padding: '5px 11px',
            borderRadius: '20px',
            whiteSpace: 'nowrap',
          }}
        >
          AI 제안
        </span>
        <span style={{ fontSize: '11.5px', fontWeight: '700', letterSpacing: '0.05em', color: '#2563EB', textTransform: 'uppercase' }}>
          AI 재무 인사이트
        </span>
      </div>

      <div style={{ fontSize: '20px', fontWeight: '800', color: '#0F172A', lineHeight: '1.35', marginBottom: '10px' }}>
        {isTop ? (
          <>
            <span style={{ color: '#2563EB' }}>{target.category}</span>은 현재 가장 높은 수익성을 보이고 있습니다.
          </>
        ) : (
          <>
            <span style={{ color: '#2563EB' }}>{target.category}</span>는 전체 {ranked.length}개 카테고리 중 수익성 {rank}위입니다.
          </>
        )}
      </div>

      <div style={{ fontSize: '14px', fontWeight: '600', color: '#1D4ED8', lineHeight: '1.6', marginBottom: '14px' }}>
        최근 1개월 기준 순이익 기여와 {wasteStable ? '안정적인 폐기율' : '개선이 필요한 폐기율'}을 바탕으로 한 분석입니다.
      </div>

      <div style={{ display: 'flex', gap: '22px', flexWrap: 'wrap', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: '700', color: '#1D4ED8', whiteSpace: 'nowrap' }}>
          <span>✓</span>순이익 기여도 {target.netShare.toFixed(0)}%
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: '700', color: '#1D4ED8', whiteSpace: 'nowrap' }}>
          <span>✓</span>폐기율 {wasteStable ? '안정 유지' : '변동 있음'} ({target.avgWasteRate.toFixed(1)}%)
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: '700', color: '#1D4ED8', whiteSpace: 'nowrap' }}>
          <span>✓</span>평균 마진율 {target.avgMarginRate.toFixed(0)}%
        </div>
      </div>

      <div style={{ fontSize: '13px', fontWeight: '500', color: '#64748B', lineHeight: '1.5' }}>
        최근 1개월 데이터를 기준으로 매출·원가·폐기 데이터를 종합 분석했습니다.
      </div>
    </div>
  );
}
