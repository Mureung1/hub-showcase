import type { CategoryStatus } from '../../types/analysis';

interface InsightStripProps {
  status: CategoryStatus;
  reasons: string[];
}

const TYPE_STYLES: Record<
  CategoryStatus,
  { cardBg: string; cardBorder: string; badgeBg: string; badgeShadow: string; badgeText: string; bulletColor: string; bulletSymbol: string; textColor: string }
> = {
  opportunity: {
    cardBg: '#EFF6FF',
    cardBorder: '#DBEAFE',
    badgeBg: '#1D4ED8',
    badgeShadow: '0 1px 3px rgba(29,78,216,0.35)',
    badgeText: 'AI 인사이트',
    bulletColor: '#1D4ED8',
    bulletSymbol: '✓',
    textColor: '#1D4ED8',
  },
  neutral: {
    cardBg: '#F8FAFC',
    cardBorder: '#E2E8F0',
    badgeBg: '#475569',
    badgeShadow: '0 1px 3px rgba(71,85,105,0.3)',
    badgeText: 'AI 인사이트',
    bulletColor: '#475569',
    bulletSymbol: '·',
    textColor: '#334155',
  },
  risk: {
    cardBg: '#FEF2F2',
    cardBorder: '#FECACA',
    badgeBg: '#DC2626',
    badgeShadow: '0 1px 3px rgba(220,38,38,0.35)',
    badgeText: '위험 신호',
    bulletColor: '#DC2626',
    bulletSymbol: '✕',
    textColor: '#991B1B',
  },
};

export default function InsightStrip({ status, reasons }: InsightStripProps) {
  const t = TYPE_STYLES[status];

  return (
    <div
      style={{
        background: t.cardBg,
        border: `1px solid ${t.cardBorder}`,
        borderRadius: '16px',
        padding: '20px 26px',
        marginBottom: '28px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
        <span
          style={{
            fontSize: '11px',
            fontWeight: '800',
            letterSpacing: '0.06em',
            color: '#fff',
            textTransform: 'uppercase',
            background: t.badgeBg,
            padding: '5px 11px',
            borderRadius: '20px',
            boxShadow: t.badgeShadow,
            whiteSpace: 'nowrap',
          }}
        >
          {t.badgeText}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {reasons.map((reason, idx) => (
          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: t.bulletColor, fontWeight: '800' }}>{t.bulletSymbol}</span>
            <span style={{ fontSize: '14px', fontWeight: '700', color: t.textColor, whiteSpace: 'nowrap' }}>
              {reason}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
