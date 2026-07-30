import { formatNutrient } from '../lib/nutrition.js'
import { colors, font, spacing } from '../styles/theme.js'

function WinBadge() {
  return (
    <span
      style={{
        marginLeft: spacing.xs,
        padding: '2px 6px',
        borderRadius: 999,
        background: colors.successSurface,
        color: colors.success,
        fontSize: font.size.xs,
        fontWeight: 700,
      }}
    >
      승
    </span>
  )
}

// StandardComparisonList.jsx와 같은 한 줄씩 나열하는 구조를 따르되, "표준보다 +Xg" 문장 대신 두 식당의
// 값을 나란히 두고 이긴 쪽에만 배지를 붙인다. rows: placeDuel.js의 compareTwoPlaces 결과.
function ComparisonRow({ row, isLast }) {
  return (
    <div
      style={{
        marginBottom: spacing.lg,
        paddingBottom: spacing.lg,
        borderBottom: isLast ? 'none' : `1px solid ${colors.border}`,
      }}
    >
      <h3 style={{ margin: `0 0 ${spacing.sm}px`, fontSize: font.size.md, fontWeight: 600, color: colors.textStrong }}>
        {row.label}
      </h3>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: font.size.md }}>
        <span style={{ color: row.winner === 'A' ? colors.textStrong : colors.textSub, fontWeight: row.winner === 'A' ? 700 : 400 }}>
          {formatNutrient(row.aValue)}
          {row.unit}
          {row.winner === 'A' && <WinBadge />}
        </span>
        <span style={{ color: row.winner === 'B' ? colors.textStrong : colors.textSub, fontWeight: row.winner === 'B' ? 700 : 400 }}>
          {formatNutrient(row.bValue)}
          {row.unit}
          {row.winner === 'B' && <WinBadge />}
        </span>
      </div>
    </div>
  )
}

export default function PlaceDuelComparisonList({ rows }) {
  if (!rows || rows.length === 0) {
    return <p style={{ margin: 0, color: colors.textSub, fontSize: font.size.sm }}>비교할 영양 정보가 부족해요.</p>
  }
  return (
    <div>
      {rows.map((row, i) => (
        <ComparisonRow key={row.key} row={row} isLast={i === rows.length - 1} />
      ))}
    </div>
  )
}
