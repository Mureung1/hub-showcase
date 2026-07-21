import { Link } from 'react-router-dom'
import { useUser } from '../context/UserContext.jsx'
import Card from './Card.jsx'
import { getKoreanAverageIntake } from '../lib/koreanAverageIntake.js'
import { buildNationalComparisonRows, describeDiff, summarizeComparison } from '../lib/nationalComparison.js'
import { colors, font, radius, spacing, styles } from '../styles/theme.js'

// status → 막대·문구 색. near/good은 긍정(그린), low는 부족(주황), high는 과다(레드).
const STATUS_COLOR = {
  near: colors.primary,
  good: colors.primary,
  low: colors.deficient,
  high: colors.danger,
}

function ComparisonRow({ row }) {
  const color = STATUS_COLOR[row.status] || colors.primary
  return (
    <div style={{ marginBottom: spacing.md }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
        <span style={{ fontSize: font.size.sm, fontWeight: 600, color: colors.textStrong }}>{row.label}</span>
        <span style={{ fontSize: font.size.xs, color }}>{describeDiff(row.diffPercent)}</span>
      </div>
      {/* 트랙은 [0, 2×평균]을 나타내고, 평균은 항상 가운데(50%) 마커. 내 값은 그 안에서의 위치만큼 채워진다. */}
      <div style={{ position: 'relative', height: 8, background: colors.track, borderRadius: radius.pill }}>
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            height: '100%',
            width: `${row.fillPercent}%`,
            background: color,
            borderRadius: radius.pill,
          }}
        />
        <div style={{ position: 'absolute', left: '50%', top: -2, width: 2, height: 12, background: colors.muted, transform: 'translateX(-1px)' }} />
      </div>
      <div style={{ marginTop: 4, fontSize: font.size.xs, color: colors.muted }}>
        내 {row.mine}
        {row.unit} · 평균 {row.avg}
        {row.unit}
      </div>
    </div>
  )
}

// 오늘 내 섭취를 한국 성별·연령대별 평균(국민건강영양조사 수준)과 비교한다. 로그인 여부와 무관하게 쓸 수
// 있어(게스트도 신체정보만 있으면 됨) 표본이 적은 초기에도 의미 있는 비교를 제공한다. 어디까지나 참고용.
export default function NationalComparisonCard() {
  const { profile, todayMealsTotal } = useUser()
  const average = getKoreanAverageIntake(profile?.sex, profile?.age)

  // 성별/나이가 없으면 평균을 고를 수 없다 — 프로필 입력으로 유도.
  if (!average) {
    return (
      <Card>
        <h2 style={{ fontSize: font.size.lg, margin: `0 0 ${spacing.sm}px`, color: colors.textStrong }}>한국 평균과 비교</h2>
        <p style={{ margin: `0 0 ${spacing.md}px`, color: colors.textSub, fontSize: font.size.sm }}>
          성별·나이를 입력하면 같은 또래 한국 평균과 오늘 섭취를 비교해드려요.
        </p>
        <Link to="/profile" className="tds-press" style={{ ...styles.buttonSecondary, display: 'inline-block', textDecoration: 'none' }}>
          신체정보 입력하러 가기
        </Link>
      </Card>
    )
  }

  const hasMeals = Number(todayMealsTotal?.calories) > 0
  if (!hasMeals) {
    return (
      <Card>
        <h2 style={{ fontSize: font.size.lg, margin: `0 0 ${spacing.sm}px`, color: colors.textStrong }}>한국 평균과 비교</h2>
        <p style={{ margin: 0, color: colors.textSub, fontSize: font.size.sm }}>
          오늘 식사를 기록하면 같은 또래 한국 평균과 비교해볼 수 있어요.
        </p>
      </Card>
    )
  }

  const rows = buildNationalComparisonRows(todayMealsTotal, average)
  const summary = summarizeComparison(rows)

  return (
    <Card>
      <h2 style={{ fontSize: font.size.lg, margin: `0 0 ${spacing.xs}px`, color: colors.textStrong }}>한국 평균과 비교</h2>
      <p style={{ margin: `0 0 ${spacing.lg}px`, fontSize: font.size.xs, color: colors.muted }}>
        같은 성별·또래의 하루 평균 섭취(국민건강영양조사 수준)와 비교했어요.
      </p>

      {rows.map((row) => (
        <ComparisonRow key={row.key} row={row} />
      ))}

      {summary && (
        <p style={{ margin: `${spacing.md}px 0 0`, padding: spacing.md, background: colors.bg, borderRadius: radius.sm, fontSize: font.size.sm, fontWeight: 600, color: colors.textStrong }}>
          {summary}
        </p>
      )}
      <p style={{ margin: `${spacing.sm}px 0 0`, fontSize: font.size.xs, color: colors.muted }}>
        평균값은 참고용 대표치예요. 나트륨은 적게 먹을수록 좋아요.
      </p>
    </Card>
  )
}
