import { useState } from 'react';
import type { WeeklyTrendPoint } from '../../types/dashboard';
import { colors } from '../../constants/colors';

interface SalesTrendChartProps {
  title?: string;
  totalLabel: string;
  points: WeeklyTrendPoint[];
  bestWeek: string;
  bestWeekLabel?: string;
}

const VIEW_W = 720;
const BASELINE_Y = 196;
const TOP_Y = 50;
const BOTTOM_Y = 175;
const PAD_X = 60;

export default function SalesTrendChart({ title = '최근 1개월 판매 추세', totalLabel, points, bestWeek, bestWeekLabel = '최고 판매 주차' }: SalesTrendChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const amounts = points.map((p) => p.amount);
  // 0을 기준선으로 고정 — min~max로 자동 스케일하면 작은 변동도 과장되어 보임
  const min = Math.min(0, ...amounts);
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
        background: colors.bgCard,
        border: `1px solid ${colors.borderColor}`,
        borderRadius: '18px',
        padding: '24px 26px 42px',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span style={{ fontSize: '15px', fontWeight: '700', color: colors.textPrimary }}>{title}</span>
        <span style={{ fontSize: '13px', color: colors.textPrimary, fontWeight: '700' }}>
          누적 매출 <span style={{ color: colors.primary }}>{totalLabel}</span>
        </span>
      </div>

      <svg viewBox={`0 0 ${VIEW_W} 220`} style={{ width: '100%', height: '230px' }} preserveAspectRatio="none">
        <defs>
          <linearGradient id="dashboardTrendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colors.primary} stopOpacity={0.16} />
            <stop offset="100%" stopColor={colors.primary} stopOpacity={0} />
          </linearGradient>
        </defs>
        <line x1="0" y1="196" x2={VIEW_W} y2="196" stroke="#F1F5F9" strokeWidth="1" />
        <line x1="0" y1="130" x2={VIEW_W} y2="130" stroke="#F1F5F9" strokeWidth="1" />
        <line x1="0" y1="64" x2={VIEW_W} y2="64" stroke="#F1F5F9" strokeWidth="1" />
        <polygon points={polygon} fill="url(#dashboardTrendFill)" />
        <polyline points={polyline} fill="none" stroke={colors.primary} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
        {coords.map((c, i) => (
          <circle
            key={i}
            cx={c.cx}
            cy={c.cy}
            r={hoveredIdx === i || i === maxIdx ? 7 : 6}
            fill={colors.primary}
            style={{ cursor: 'pointer' }}
            onMouseEnter={() => setHoveredIdx(i)}
            onMouseLeave={() => setHoveredIdx(null)}
          >
            <title>{points[i].tooltip}</title>
          </circle>
        ))}
        <circle cx={coords[maxIdx].cx} cy={coords[maxIdx].cy} r={11} fill={colors.primary} opacity={0.18} style={{ pointerEvents: 'none' }} />
      </svg>

      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 4px' }}>
        {points.map((p, i) => (
          <div key={p.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
            <span style={{ fontSize: '11.5px', color: colors.textTertiary, fontWeight: '600' }}>{p.label}</span>
            <span
              style={{
                fontSize: '11px',
                fontWeight: i === maxIdx || hoveredIdx === i ? '800' : '600',
                color: i === maxIdx || hoveredIdx === i ? colors.primary : colors.textTertiary,
              }}
            >
              {p.amount.toLocaleString()}천원
            </span>
          </div>
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
        <span style={{ fontSize: '12.5px', color: colors.textSecondary, fontWeight: '600', whiteSpace: 'nowrap', flexShrink: 0 }}>
          {bestWeekLabel} · <strong style={{ color: colors.textPrimary }}>{bestWeek}</strong>
        </span>
        <span style={{ fontSize: '11px', color: colors.textTertiary, fontWeight: '600', textAlign: 'right' }}>단위: 천 원</span>
      </div>
    </div>
  );
}
