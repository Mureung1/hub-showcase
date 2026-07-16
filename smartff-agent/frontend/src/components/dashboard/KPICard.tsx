interface KPICardProps {
  salesTrend: string;
  salesNote: string;
  wasteRate: string;
  wasteNote: string;
  marginRate: string;
  marginNote: string;
}

export default function KPICard({ salesTrend, salesNote, wasteRate, wasteNote, marginRate, marginNote }: KPICardProps) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
      {/* 판매 추세 — 강조 카드 */}
      <div style={{ background: '#EFF6FF', border: '1px solid #DBEAFE', borderRadius: '14px', padding: '20px 22px' }}>
        <div style={{ fontSize: '13px', fontWeight: '700', color: '#1D4ED8', marginBottom: '8px' }}>판매 추세</div>
        <div style={{ fontSize: '56px', fontWeight: '800', color: '#2563EB', lineHeight: '1', letterSpacing: '-0.02em' }}>
          {salesTrend}
          <span style={{ fontSize: '24px' }}>%</span>
        </div>
        <div style={{ fontSize: '12px', color: '#64748B', marginTop: '8px', fontWeight: '600' }}>{salesNote}</div>
      </div>

      {/* 폐기율 */}
      <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '20px 22px' }}>
        <div style={{ fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '8px' }}>폐기율</div>
        <div style={{ fontSize: '32px', fontWeight: '800', color: '#0F172A', lineHeight: '1', letterSpacing: '-0.02em' }}>
          {wasteRate}
          <span style={{ fontSize: '16px' }}>%</span>
        </div>
        <div style={{ fontSize: '11.5px', color: '#94A3B8', marginTop: '6px', fontWeight: '600' }}>{wasteNote}</div>
      </div>

      {/* 평균 마진율 */}
      <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '20px 22px' }}>
        <div style={{ fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '8px' }}>평균 마진율</div>
        <div style={{ fontSize: '38px', fontWeight: '800', color: '#1D4ED8', lineHeight: '1', letterSpacing: '-0.02em' }}>
          {marginRate}
          <span style={{ fontSize: '18px' }}>%</span>
        </div>
        <div style={{ fontSize: '11.5px', color: '#94A3B8', marginTop: '6px', fontWeight: '600' }}>{marginNote}</div>
      </div>
    </div>
  );
}
