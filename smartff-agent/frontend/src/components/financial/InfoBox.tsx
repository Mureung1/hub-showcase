interface InfoBoxProps {
  marginRate: number;
  marginAmount: number;
  totalSales: number;
}

export default function InfoBox({ marginRate, marginAmount, totalSales }: InfoBoxProps) {
  const formatCurrency = (val: number) => {
    if (val >= 1000000) {
      return `${(val / 1000000).toFixed(1)}백만원`;
    }
    return `${Math.round(val).toLocaleString()}원`;
  };

  const checklist = [
    { checked: marginRate > 30, label: '마진율 30% 이상 달성' },
    { checked: totalSales > 20000000, label: '월 매출액 2천만원 이상' },
    { checked: marginAmount > 7000000, label: '월 마진액 700만원 이상' },
  ];

  return (
    <div
      style={{
        background: '#DBEAFE',
        border: '1px solid #93C5FD',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '24px',
      }}
    >
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
        <span style={{ fontSize: '14px', fontWeight: '600', color: '#1E40AF' }}>도움말</span>
        <span style={{ fontSize: '14px', fontWeight: '600', color: '#1E40AF' }}>마진관리</span>
      </div>

      <p style={{ fontSize: '13px', color: '#1E40AF', margin: '0 0 12px 0', lineHeight: '1.5' }}>
        도시에는 점점 더 증가 중이며, 카테고리별 마진 관리가 중요합니다.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {checklist.map((item, idx) => (
          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="checkbox"
              checked={item.checked}
              disabled
              style={{
                width: '16px',
                height: '16px',
                cursor: 'default',
                accentColor: '#2563EB',
              }}
            />
            <span
              style={{
                fontSize: '13px',
                color: item.checked ? '#059669' : '#64748B',
              }}
            >
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
