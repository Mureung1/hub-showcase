import type { MarginBarItem } from '../../types/dashboard';
import { colors } from '../../constants/colors';

interface MarginBarListProps {
  items: MarginBarItem[];
  onViewAllClick?: () => void;
}

// design_system.md 마진율 바 규칙: 1위만 진한 네이비, 나머지는 라이트 블루 (AI 추천은 배지로만 구분)
function barColor(item: MarginBarItem) {
  return item.isTop ? colors.chartBarHighlight : colors.chartSecondary;
}

function rateColor(item: MarginBarItem) {
  if (item.isAiPick) return colors.primary;
  if (item.isRisk) return colors.danger;
  if (item.isTop) return colors.textPrimary;
  return colors.textSecondary;
}

export default function MarginBarList({ items, onViewAllClick }: MarginBarListProps) {
  const maxRate = Math.max(...items.map((i) => i.rate)) || 1;

  return (
    <div
      style={{
        background: colors.bgCard,
        border: `1px solid ${colors.borderColor}`,
        borderRadius: '18px',
        padding: '24px 26px',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '7px', marginBottom: '16px', flexWrap: 'nowrap' }}>
        <span style={{ fontSize: '13.5px', fontWeight: '700', color: colors.textPrimary, whiteSpace: 'nowrap' }}>카테고리별 마진율</span>
        <span style={{ fontSize: '11px', color: colors.textTertiary, fontWeight: '600', whiteSpace: 'nowrap' }}>(최근 1개월 기준)</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '18px', flex: 1 }}>
        {items.map((item) => (
          <div key={item.name}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '10px', marginBottom: '6px' }}>
              <span style={{ color: colors.textPrimary, fontWeight: '600', fontSize: '12px', whiteSpace: 'nowrap' }}>
                {item.name}
                {item.isAiPick && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px',
                      color: '#fff',
                      background: colors.primary,
                      fontWeight: '800',
                      fontSize: '10px',
                      letterSpacing: '0.03em',
                      padding: '3px 9px',
                      borderRadius: '20px',
                      verticalAlign: 'middle',
                      whiteSpace: 'nowrap',
                      marginLeft: '4px',
                    }}
                  >
                    ★ AI 추천
                  </span>
                )}
                {item.riskLabel && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px',
                      color: '#fff',
                      background: colors.danger,
                      fontWeight: '800',
                      fontSize: '10px',
                      letterSpacing: '0.03em',
                      padding: '3px 9px',
                      borderRadius: '20px',
                      verticalAlign: 'middle',
                      whiteSpace: 'nowrap',
                      marginLeft: '4px',
                    }}
                  >
                    {item.riskLabel}
                  </span>
                )}
              </span>
              <span style={{ color: rateColor(item), fontWeight: '800', fontSize: '16px', whiteSpace: 'nowrap' }}>{item.rate}%</span>
            </div>
            <div style={{ height: '7px', borderRadius: '4px', background: '#F1F5F9' }}>
              <div
                style={{
                  width: `${Math.round((item.rate / maxRate) * 100)}%`,
                  height: '100%',
                  borderRadius: '4px',
                  background: barColor(item),
                }}
              />
            </div>
            <div style={{ marginTop: '6px', fontSize: '11px', fontWeight: '600', whiteSpace: 'nowrap' }}>
              <span style={{ color: item.deltaGood ? colors.success : colors.danger, fontWeight: '700' }}>{item.delta}</span>
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid #F1F5F9', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <span style={{ fontSize: '10.5px', color: '#CBD5E1', fontWeight: '600', lineHeight: '1.5' }}>
          전월 대비 수치는 2개월 이상 데이터가 누적된 경우에만 표시됩니다
        </span>
        <button
          onClick={onViewAllClick}
          style={{
            fontSize: '12px',
            fontWeight: '700',
            color: colors.primary,
            whiteSpace: 'nowrap',
            alignSelf: 'flex-end',
            cursor: 'pointer',
            background: 'none',
            border: 'none',
            padding: 0,
            fontFamily: 'inherit',
          }}
        >
          전체 카테고리 보기 →
        </button>
      </div>
    </div>
  );
}
