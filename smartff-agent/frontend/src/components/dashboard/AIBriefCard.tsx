interface AIBriefCardProps {
  titleHighlight: string;
  titleRest: string;
  reasons: string[];
  ctaLabel: string;
}

export default function AIBriefCard({ titleHighlight, titleRest, reasons, ctaLabel }: AIBriefCardProps) {
  return (
    <div style={{ background: '#EFF6FF', border: '1px solid #DBEAFE', borderRadius: '16px', padding: '22px 26px' }}>
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
            boxShadow: '0 1px 3px rgba(29,78,216,0.35)',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          AI 제안
        </span>
        <span style={{ fontSize: '11.5px', fontWeight: '700', letterSpacing: '0.05em', color: '#2563EB', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
          오늘의 AI 브리핑
        </span>
      </div>

      <div style={{ marginBottom: '14px' }}>
        <span style={{ fontSize: '29px', fontWeight: '800', color: '#0F172A', lineHeight: '1.3', letterSpacing: '-0.01em' }}>
          <span style={{ color: '#2563EB' }}>{titleHighlight}</span>
          {titleRest}
        </span>
      </div>

      <div style={{ marginBottom: '14px', maxWidth: '560px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {reasons.map((reason) => (
            <div key={reason} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: '700', color: '#1D4ED8', whiteSpace: 'nowrap' }}>
              <span style={{ color: '#2563EB', fontWeight: '800' }}>✓</span>
              {reason}
            </div>
          ))}
        </div>
        <div style={{ fontSize: '13.5px', fontWeight: '500', color: '#64748B', lineHeight: '1.5', marginTop: '10px' }}>
          최종 발주 결정은 점주가 직접 검토해 주세요.
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
        <span
          style={{
            fontSize: '11.5px',
            fontWeight: '700',
            color: '#2563EB',
            padding: '6px 12px',
            background: '#FFFFFF',
            border: '1px solid #BFDBFE',
            borderRadius: '20px',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          {ctaLabel}
        </span>
      </div>
    </div>
  );
}
