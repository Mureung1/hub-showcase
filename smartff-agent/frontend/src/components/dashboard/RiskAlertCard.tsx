interface RiskAlertCardProps {
  title: string;
  reasons: string[];
  ctaLabel: string;
}

export default function RiskAlertCard({ title, reasons, ctaLabel }: RiskAlertCardProps) {
  return (
    <div
      style={{
        background: '#FEF2F2',
        border: '1px solid #FECACA',
        borderRadius: '16px',
        padding: '22px 26px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'flex-start',
        gap: '10px',
      }}
    >
      <span
        style={{
          fontSize: '10px',
          fontWeight: '800',
          letterSpacing: '0.06em',
          color: '#fff',
          textTransform: 'uppercase',
          background: '#DC2626',
          padding: '5px 11px',
          borderRadius: '20px',
          boxShadow: '0 1px 3px rgba(220,38,38,0.35)',
          whiteSpace: 'nowrap',
        }}
      >
        위험 신호
      </span>

      <div style={{ fontSize: '26px', fontWeight: '800', color: '#0F172A', lineHeight: '1.3', letterSpacing: '-0.01em', whiteSpace: 'pre-line' }}>
        {title}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '2px' }}>
        {reasons.map((reason) => (
          <div key={reason} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: '700', color: '#991B1B', whiteSpace: 'nowrap' }}>
            <span style={{ color: '#DC2626', fontWeight: '800' }}>✕</span>
            {reason}
          </div>
        ))}
      </div>

      <span
        style={{
          marginTop: '6px',
          fontSize: '11.5px',
          fontWeight: '700',
          color: '#DC2626',
          padding: '6px 12px',
          background: '#FFFFFF',
          border: '1px solid #FECACA',
          borderRadius: '20px',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          alignSelf: 'flex-end',
        }}
      >
        {ctaLabel}
      </span>
    </div>
  );
}
