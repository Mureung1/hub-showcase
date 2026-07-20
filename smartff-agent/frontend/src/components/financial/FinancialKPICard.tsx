interface FinancialKPICardProps {
  label: string;
  value: number;
  format: 'currency' | 'percent';
  color: 'primary' | 'danger' | 'warning' | 'success';
}

export default function FinancialKPICard({ label, value, format, color }: FinancialKPICardProps) {
  const formatValue = (val: number, fmt: string) => {
    if (fmt === 'currency') {
      return `${(val / 1000000).toFixed(1)}M`;
    }
    if (fmt === 'percent') {
      return `${val.toFixed(1)}%`;
    }
    return val.toString();
  };

  const colorMap = {
    primary: { bg: '#EFF6FF', text: '#1D4ED8' },
    danger: { bg: '#FEF2F2', text: '#DC2626' },
    warning: { bg: '#FFF7ED', text: '#EA580C' },
    success: { bg: '#F0FDF4', text: '#15803D' },
  };

  const c = colorMap[color];

  return (
    <div style={{
      background: '#FFFFFF',
      border: `1px solid #E2E8F0`,
      borderRadius: '12px',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
    }}>
      <p style={{ fontSize: '12px', fontWeight: '600', color: '#475569', margin: '0' }}>{label}</p>
      <div style={{ background: c.bg, borderRadius: '8px', padding: '12px', display: 'flex', alignItems: 'center' }}>
        <p style={{ fontSize: '28px', fontWeight: '700', color: c.text, margin: '0' }}>
          {formatValue(value, format)}
        </p>
      </div>
    </div>
  );
}
