import type { WeeklyTrendPoint } from '../../types/dashboard';

interface SalesTrendChartProps {
  totalLabel: string;
  points: WeeklyTrendPoint[];
  bestWeek: string;
}

const VIEW_W = 720;
const BASELINE_Y = 196;
const TOP_Y = 50;
const BOTTOM_Y = 175;
const PAD_X = 60;

export default function SalesTrendChart({ totalLabel, points, bestWeek }: SalesTrendChartProps) {
  const amounts = points.map((p) => p.amount);
  const min = Math.min(...amounts);
  const max = Math.max(...amounts);
  const range = max - min || 1;
  const maxIdx = amounts.indexOf(max);

  const coords = points.map((p, i) => ({
    cx: PAD_X + (i * (VIEW_W - PAD_X * 2)) / (points.length - 1 || 1),
    cy: BOTTOM_Y - ((p.amount - min) / range) * (BOTTOM_Y - TOP_Y),
  }));

  const polyline = coords.map((c) => `${c.cx},${c.cy}`).join(' ');
  const polygon = `${polyline} ${coords[coords.length - 1].cx},${BASELINE_Y} ${coords[0].cx},${BASELINE_Y}`;

  return (
    <div
      style={{
        background: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: '18px',
        padding: '24px 26px 42px',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span style={{ fontSize: '15px', fontWeight: '700', color: '#0F172A' }}>최근 4주 판매 추세</span>
        <span style={{ fontSize: '13px', color: '#0F172A', fontWeight: '700' }}>
          누적 매출 <span style={{ color: '#2563EB' }}>{totalLabel}</span>
        </span>
      </div>

      <svg viewBox={`0 0 ${VIEW_W} 220`} style={{ width: '100%', height: '230px' }} preserveAspectRatio="none">
        <defs>
          <linearGradient id="dashboardTrendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2563EB" stopOpacity={0.16} />
            <stop offset="100%" stopColor="#2563EB" stopOpacity={0} />
          </linearGradient>
        </defs>
        <line x1="0" y1="196" x2={VIEW_W} y2="196" stroke="#F1F5F9" strokeWidth="1" />
        <line x1="0" y1="130" x2={VIEW_W} y2="130" stroke="#F1F5F9" strokeWidth="1" />
        <line x1="0" y1="64" x2={VIEW_W} y2="64" stroke="#F1F5F9" strokeWidth="1" />
        <polygon points={polygon} fill="url(#dashboardTrendFill)" />
        <polyline points={polyline} fill="none" stroke="#2563EB" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
        {coords.map((c, i) => (
          <circle key={i} cx={c.cx} cy={c.cy} r={i === maxIdx ? 7 : 6} fill="#2563EB" style={{ cursor: 'pointer' }}>
            <title>{points[i].tooltip}</title>
          </circle>
        ))}
        <circle cx={coords[maxIdx].cx} cy={coords[maxIdx].cy} r={11} fill="#2563EB" opacity={0.18} />
      </svg>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: '#94A3B8', fontWeight: '600', padding: '0 4px' }}>
        {points.map((p) => (
          <span key={p.label}>{p.label}</span>
        ))}
      </div>

      <div
        style={{
          marginTop: '14px',
          paddingTop: '14px',
          borderTop: '1px solid #F1F5F9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          flexWrap: 'nowrap',
        }}
      >
        <span style={{ fontSize: '12.5px', color: '#475569', fontWeight: '600', whiteSpace: 'nowrap', flexShrink: 0 }}>
          최고 판매 주차 · <strong style={{ color: '#0F172A' }}>{bestWeek}</strong>
        </span>
        <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: '600', textAlign: 'right' }}>
          단위: 천 원 · 포인트에 마우스를 올리면 주차별 매출액이 표시됩니다
        </span>
      </div>
    </div>
  );
}
