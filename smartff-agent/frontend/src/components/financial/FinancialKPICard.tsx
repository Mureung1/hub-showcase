interface KPIDelta {
  pct: number;
  goodWhenUp: boolean;
}

interface FinancialKPICardProps {
  label: string;
  value: number;
  note: string;
  color?: 'default' | 'danger' | 'highlight';
  delta?: KPIDelta | null;
}

function formatWon(val: number): string {
  return `${Math.round(val).toLocaleString('ko-KR')}`;
}

export default function FinancialKPICard({ label, value, note, color = 'default', delta }: FinancialKPICardProps) {
  const isHighlight = color === 'highlight';
  const isDanger = color === 'danger';
  const valueColor = isDanger ? '#DC2626' : isHighlight ? '#1D4ED8' : '#0F172A';
  const bg = isHighlight ? '#EFF6FF' : isDanger ? '#FEF2F2' : '#FFFFFF';
  const borderColor = isHighlight ? '#DBEAFE' : isDanger ? '#FECACA' : '#E2E8F0';
  const labelColor = isHighlight ? '#1D4ED8' : isDanger ? '#B91C1C' : '#475569';
  const noteColor = isHighlight ? '#2563EB' : isDanger ? '#DC2626' : '#94A3B8';

  let deltaColor = '#94A3B8';
  let deltaText: string | null = null;
  if (delta) {
    const isGood = delta.goodWhenUp ? delta.pct >= 0 : delta.pct <= 0;
    deltaColor = isGood ? '#15803D' : '#DC2626';
    const arrow = delta.pct >= 0 ? '↑' : '↓';
    deltaText = `${arrow} 전월 대비 ${delta.pct >= 0 ? '+' : ''}${delta.pct.toFixed(1)}%`;
  }

  return (
    <div
      style={{
        background: bg,
        border: `1px solid ${borderColor}`,
        borderRadius: '14px',
        padding: '20px 22px',
      }}
    >
      <div style={{ fontSize: '12px', fontWeight: '700', color: labelColor, marginBottom: '8px' }}>
        {label}
      </div>
      <div style={{ fontSize: '26px', fontWeight: '800', color: valueColor, lineHeight: '1' }}>
        {formatWon(value)}
        <span style={{ fontSize: '14px' }}>원</span>
      </div>
      <div style={{ fontSize: '11.5px', color: noteColor, marginTop: '8px', fontWeight: isHighlight || isDanger ? '700' : '600' }}>
        {note}
      </div>
      {deltaText && (
        <div style={{ fontSize: '11.5px', color: deltaColor, marginTop: '4px', fontWeight: '700' }}>
          {deltaText}
        </div>
      )}
    </div>
  );
}
