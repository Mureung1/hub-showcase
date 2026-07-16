interface KPICardProps {
  sales: string;
  wasteRate: number;
  marginRate: number;
}

export default function KPICard({ sales, wasteRate, marginRate }: KPICardProps) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '20px' }}>
      {/* Sales Trend Card */}
      <div
        style={{
          background: '#EFF6FF',
          border: '1px solid #DBEAFE',
          borderRadius: '16px',
          padding: '22px 26px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        <div style={{ fontSize: '13px', color: '#2563EB', fontWeight: '600' }}>판매 추세</div>
        <div style={{ fontSize: '56px', fontWeight: '800', color: '#2563EB', lineHeight: '1' }}>{sales}</div>
      </div>

      {/* Waste Rate Card */}
      <div
        style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '16px',
          padding: '22px 26px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        <div style={{ fontSize: '12px', color: '#475569', fontWeight: '600' }}>폐기율</div>
        <div style={{ fontSize: '32px', fontWeight: '800', color: '#0F172A', lineHeight: '1' }}>
          {wasteRate}%
        </div>
      </div>

      {/* Margin Rate Card (spans full width on 2-col grid) */}
      <div
        style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '16px',
          padding: '22px 26px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          gridColumn: '1 / -1',
        }}
      >
        <div style={{ fontSize: '12px', color: '#475569', fontWeight: '600' }}>평균 마진율</div>
        <div style={{ fontSize: '38px', fontWeight: '800', color: '#0F172A', lineHeight: '1' }}>
          {marginRate}%
        </div>
      </div>
    </div>
  );
}
