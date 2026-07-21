import { colors } from '../../constants/colors';

interface RiskAlertCardProps {
  title: string;
  reasons: string[];
  ctaLabel: string;
  onCtaClick?: () => void;
}

export default function RiskAlertCard({ title, reasons, ctaLabel, onCtaClick }: RiskAlertCardProps) {
  return (
    <div
      style={{
        background: colors.dangerTint,
        border: `1px solid ${colors.dangerBorder}`,
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
          fontSize: '11px',
          fontWeight: '800',
          letterSpacing: '0.06em',
          color: '#fff',
          textTransform: 'uppercase',
          background: colors.danger,
          padding: '5px 11px',
          borderRadius: '20px',
          boxShadow: '0 1px 3px rgba(220,38,38,0.35)',
          whiteSpace: 'nowrap',
        }}
      >
        위험 신호
      </span>

      <div style={{ fontSize: '26px', fontWeight: '800', color: colors.textPrimary, lineHeight: '1.3', letterSpacing: '-0.01em', whiteSpace: 'pre-line' }}>
        {title}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '2px' }}>
        {reasons.map((reason) => (
          <div key={reason} style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', fontSize: '14px', fontWeight: '700', color: '#991B1B', lineHeight: '1.4' }}>
            <span style={{ color: colors.danger, fontWeight: '800', flexShrink: 0 }}>✕</span>
            {reason}
          </div>
        ))}
      </div>

      <button
        onClick={onCtaClick}
        style={{
          marginTop: '6px',
          fontSize: '11.5px',
          fontWeight: '700',
          color: colors.danger,
          padding: '6px 12px',
          background: colors.bgCard,
          border: `1px solid ${colors.dangerBorder}`,
          borderRadius: '20px',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          alignSelf: 'flex-end',
          fontFamily: 'inherit',
        }}
      >
        {ctaLabel}
      </button>
    </div>
  );
}
