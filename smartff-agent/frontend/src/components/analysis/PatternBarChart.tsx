interface PatternBarChartProps {
  title: string;
  subtitle: string;
  values: number[];
  labels: string[];
  gap: number;
  bestLabel: string;
  bestPrefix: string;
  summary: string;
}

export default function PatternBarChart({
  title,
  subtitle,
  values,
  labels,
  gap,
  bestLabel,
  bestPrefix,
  summary,
}: PatternBarChartProps) {
  const ranked = values.map((h, i) => ({ h, i })).sort((a, b) => b.h - a.h);
  const rankOf: Record<number, number> = {};
  ranked.forEach((item, rank) => {
    rankOf[item.i] = rank;
  });

  const barColor = (rank: number) => (rank === 0 ? '#2563EB' : rank === 1 ? '#93C5FD' : '#EFF2F7');

  // 값 크기와 무관하게 최대값을 컨테이너 높이(170px)에 맞춰 정규화
  const MAX_BAR_HEIGHT = 170;
  const maxValue = Math.max(...values) || 1;
  const barHeight = (h: number) => Math.round((h / maxValue) * MAX_BAR_HEIGHT);

  return (
    <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '18px', padding: '24px 26px' }}>
      <div style={{ display: 'flex', flexWrap: 'nowrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '28px' }}>
        <span style={{ fontSize: '15px', fontWeight: '700', color: '#0F172A', whiteSpace: 'nowrap', flexShrink: 0 }}>
          {title}
        </span>
        <span
          style={{
            fontSize: '12px',
            color: '#94A3B8',
            fontWeight: '600',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            minWidth: 0,
          }}
        >
          {subtitle}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: `${gap}px`, height: '170px', padding: '0 4px', marginTop: '8px' }}>
        {values.map((h, i) => {
          const rank = rankOf[i];
          const isBest = rank === 0;
          return (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '100%', height: `${Math.min(barHeight(h), MAX_BAR_HEIGHT - 4)}px`, background: barColor(rank), borderRadius: '6px 6px 0 0' }} />
              <span
                style={{
                  fontSize: '11px',
                  color: isBest ? '#0F172A' : '#94A3B8',
                  fontWeight: isBest ? '800' : '600',
                  whiteSpace: 'nowrap',
                }}
              >
                {labels[i]}
              </span>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid #F1F5F9', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <span style={{ fontSize: '12.5px', color: '#475569', fontWeight: '600' }}>
          {bestPrefix} · <strong style={{ color: '#0F172A' }}>{bestLabel}</strong>
        </span>
        <span style={{ fontSize: '12px', color: '#2563EB', fontWeight: '700' }}>→ 요약: {summary}</span>
      </div>
    </div>
  );
}
