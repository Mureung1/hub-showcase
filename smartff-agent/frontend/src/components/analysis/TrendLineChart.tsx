import { seriesToSvg } from '../../utils/analysisSummary';

interface TrendLineChartProps {
  title: string;
  trendLabel: string;
  good: boolean | null;
  values: number[];
  xLabels: string[];
  summary: string;
  goodColor: string;
  gradientId: string;
  gradientOpacity: number;
  strokeWidth: number;
}

export default function TrendLineChart({
  title,
  trendLabel,
  good,
  values,
  xLabels,
  summary,
  goodColor,
  gradientId,
  gradientOpacity,
  strokeWidth,
}: TrendLineChartProps) {
  const lineColor = good === true ? goodColor : good === false ? '#DC2626' : '#64748B';
  const trendTextColor = good === true ? '#15803D' : good === false ? '#DC2626' : '#64748B';
  const geo = seriesToSvg(values, 620, 200, 40);
  const maxIdx = values.indexOf(Math.max(...values));

  return (
    <div
      style={{
        background: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: '18px',
        padding: '24px 26px 30px',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span style={{ fontSize: '15px', fontWeight: '700', color: '#0F172A' }}>{title}</span>
        <span style={{ fontSize: '12px', color: trendTextColor, fontWeight: '700', whiteSpace: 'nowrap', flexShrink: 0 }}>
          최근 4주 {trendLabel}
        </span>
      </div>

      <svg viewBox="0 0 620 200" style={{ width: '100%', height: '210px' }} preserveAspectRatio="none">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={lineColor} stopOpacity={gradientOpacity} />
            <stop offset="100%" stopColor={lineColor} stopOpacity={0} />
          </linearGradient>
        </defs>
        <line x1="0" y1="176" x2="620" y2="176" stroke="#E2E8F0" strokeWidth="1" />
        <line x1="0" y1="116" x2="620" y2="116" stroke="#E2E8F0" strokeWidth="1" />
        <line x1="0" y1="56" x2="620" y2="56" stroke="#E2E8F0" strokeWidth="1" />
        <polygon points={geo.polygon} fill={`url(#${gradientId})`} />
        <polyline
          points={geo.points}
          fill="none"
          stroke={lineColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {geo.dots.map((dot, i) => (
          <circle key={i} cx={dot.cx} cy={dot.cy} r={dot.r} fill={lineColor} />
        ))}
        <circle cx={geo.dots[maxIdx].cx} cy={geo.dots[maxIdx].cy} r={11} fill={lineColor} opacity={0.18} />
      </svg>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94A3B8', fontWeight: '600', padding: '0 4px' }}>
        {xLabels.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>

      <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #F1F5F9' }}>
        <span style={{ fontSize: '12px', color: '#2563EB', fontWeight: '700' }}>→ 요약: {summary}</span>
      </div>
    </div>
  );
}
