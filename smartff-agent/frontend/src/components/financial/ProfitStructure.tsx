interface ProfitStructureProps {
  totalSales: number;
  costAmount: number;
  costRate: number;
  totalMargin: number;
  marginRate: number;
  totalWaste: number;
  wasteRate: number;
  netIncome: number;
  netRate: number;
}

function formatWon(val: number): string {
  return `${Math.round(val).toLocaleString('ko-KR')}원`;
}

interface Step {
  label: string;
  amount: number;
  rateLabel: string;
  kind: 'base' | 'minus' | 'result';
}

export default function ProfitStructure({
  totalSales,
  costAmount,
  costRate,
  totalMargin,
  marginRate,
  totalWaste,
  wasteRate,
  netIncome,
  netRate,
}: ProfitStructureProps) {
  const steps: Step[] = [
    { label: '매출', amount: totalSales, rateLabel: '100%', kind: 'base' },
    { label: '(−) 매출원가', amount: costAmount, rateLabel: `원가율 ${costRate.toFixed(1)}%`, kind: 'minus' },
    { label: '= 매출총이익 (마진액)', amount: totalMargin, rateLabel: `마진율 ${marginRate.toFixed(1)}%`, kind: 'result' },
    { label: '(−) 폐기손실', amount: totalWaste, rateLabel: `폐기율 ${wasteRate.toFixed(1)}%`, kind: 'minus' },
    { label: '= 영업이익 (추정 순이익)', amount: netIncome, rateLabel: `순이익률 ${netRate.toFixed(1)}%`, kind: 'result' },
  ];

  const colorMap: Record<Step['kind'], { bar: string; text: string; barBg: string }> = {
    base: { bar: '#2563EB', text: '#0F172A', barBg: '#EFF6FF' },
    minus: { bar: '#94A3B8', text: '#475569', barBg: '#F1F5F9' },
    result: { bar: '#1D4ED8', text: '#1D4ED8', barBg: '#EFF6FF' },
  };

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
        <span style={{ fontSize: '15px', fontWeight: '700', color: '#0F172A' }}>손익 구조</span>
        <span style={{ fontSize: '12px', color: '#94A3B8', fontWeight: '600', whiteSpace: 'nowrap' }}>
          매출 대비 비율 기준
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {steps.map((step) => {
          const c = colorMap[step.kind];
          const widthPct = totalSales > 0 ? Math.min((step.amount / totalSales) * 100, 100) : 0;
          return (
            <div key={step.label}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '6px', gap: '10px' }}>
                <span style={{ fontSize: '13px', fontWeight: step.kind === 'result' ? '700' : '600', color: step.kind === 'minus' ? '#475569' : '#0F172A' }}>
                  {step.label}
                </span>
                <span style={{ display: 'flex', alignItems: 'baseline', gap: '8px', whiteSpace: 'nowrap' }}>
                  <span style={{ fontSize: '15px', fontWeight: '800', color: c.text }}>{formatWon(step.amount)}</span>
                  <span style={{ fontSize: '11.5px', fontWeight: '700', color: '#94A3B8' }}>{step.rateLabel}</span>
                </span>
              </div>
              <div style={{ height: '10px', borderRadius: '5px', background: c.barBg }}>
                <div
                  style={{
                    width: `${widthPct}%`,
                    height: '100%',
                    borderRadius: '5px',
                    background: c.bar,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
