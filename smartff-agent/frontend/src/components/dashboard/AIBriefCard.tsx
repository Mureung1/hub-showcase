interface AIBriefCardProps {
  title: string;
  reasons: string[];
  ctaLabel: string;
}

export default function AIBriefCard({ title, reasons, ctaLabel }: AIBriefCardProps) {
  return (
    <div
      style={{
        background: '#EFF6FF',
        border: '1px solid #DBEAFE',
        borderRadius: '16px',
        padding: '22px 26px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span
          style={{
            padding: '4px 10px',
            background: '#2563EB',
            color: '#FFFFFF',
            fontSize: '11px',
            fontWeight: '600',
            borderRadius: '9999px',
          }}
        >
          AI 제안
        </span>
        <span style={{ fontSize: '12px', color: '#2563EB', fontWeight: '600' }}>오늘의 AI 브리핑</span>
      </div>

      <div style={{ fontSize: '29px', fontWeight: '800', color: '#2563EB', lineHeight: '1.2' }}>{title}</div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {reasons.map((reason, i) => (
          <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
            <span style={{ color: '#15803D', fontSize: '16px', fontWeight: '700', lineHeight: '1.2' }}>✓</span>
            <span style={{ fontSize: '13px', color: '#475569', lineHeight: '1.4' }}>{reason}</span>
          </div>
        ))}
      </div>

      <div style={{ fontSize: '12px', color: '#94A3B8', lineHeight: '1.4', marginTop: '4px' }}>
        최종 발주 결정은 점주가 직접 검토해 주세요.
      </div>

      <button
        style={{
          padding: '10px 16px',
          background: '#FFFFFF',
          border: '1.5px solid #2563EB',
          borderRadius: '8px',
          color: '#2563EB',
          fontSize: '13px',
          fontWeight: '600',
          cursor: 'pointer',
          marginTop: '4px',
        }}
      >
        {ctaLabel}
      </button>
    </div>
  );
}
