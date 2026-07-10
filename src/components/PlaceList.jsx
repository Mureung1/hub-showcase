import { formatNutrient, NUTRIENT_LABELS } from '../lib/nutrition.js'
import { colors, font, spacing, styles } from '../styles/theme.js'

// 한글 단어의 마지막 음절에 받침이 있는지 판정(이/가 조사 선택용). 유니코드 한글 syllable 공식 사용.
function hasBatchim(word) {
  if (!word) return false
  const code = word.charCodeAt(word.length - 1) - 0xac00
  if (code < 0 || code > 11171) return false
  return code % 28 !== 0
}

// 예상 섭취량(숫자+단위) 뒤에 붙는 을/를 — 단위의 한글 발음(그램/킬로칼로리/밀리그램) 기준 고정 매핑
const UNIT_PARTICLE = { kcal: '를', g: '을', mg: '을' }

// 이미 계산된 "오늘 부족한 영양소"(top3Rows) 중, 이 식당의 예상 섭취량(expected)이 커버하는 항목만 골라
// 짧은 추천 이유 문장을 만든다. 부족 영양소 데이터가 없거나 이 메뉴가 그 영양소를 채워주지 않으면 표시 생략.
function buildReason(expected, deficientRows) {
  if (!expected || !deficientRows || deficientRows.length === 0) return null
  const covered = deficientRows.filter((row) => typeof expected[row.key] === 'number')
  if (covered.length === 0) return null

  if (covered.length === 1) {
    const row = covered[0]
    const amount = `${formatNutrient(expected[row.key])}${row.unit}`
    return `부족한 ${row.label} ${amount}${UNIT_PARTICLE[row.unit] || '을'} 채울 수 있어요`
  }

  const labels = covered.map((row) => row.label).join(', ')
  const lastLabel = covered[covered.length - 1].label
  return `${labels}${hasBatchim(lastLabel) ? '이' : '가'} 부족해서 추천해요`
}

// 오늘 이미 먹은 총합에 이 메뉴의 예상 섭취량을 더했을 때, 권장량(나트륨은 상한)을 넘기는 영양소 키 집합.
function buildOverageKeys(expected, todayTotal, recommended) {
  const keys = new Set()
  if (!expected || !todayTotal || !recommended) return keys
  NUTRIENT_LABELS.forEach(({ key }) => {
    if (typeof expected[key] !== 'number') return
    const projected = (Number(todayTotal[key]) || 0) + expected[key]
    if (recommended[key] > 0 && projected > recommended[key]) keys.add(key)
  })
  return keys
}

// "이 메뉴를 먹으면 어떤 영양소가 넘치는지"를 색으로 보여주는 예상 섭취량 줄. 초과하는 영양소만 빨간색.
function ExpectedNutrients({ expected, overageKeys }) {
  const rows = NUTRIENT_LABELS.filter(({ key }) => typeof expected[key] === 'number')
  if (rows.length === 0) return null

  return (
    <div style={{ marginTop: spacing.sm }}>
      <p style={{ margin: `0 0 ${spacing.xs}px`, color: colors.muted, fontSize: font.size.xs }}>예상 영양 섭취량</p>
      <p style={{ margin: 0, fontSize: font.size.sm, lineHeight: 1.6 }}>
        {rows.map(({ key, label, unit }, i) => (
          <span key={key} style={{ color: overageKeys.has(key) ? colors.danger : colors.body }}>
            {i > 0 && ' · '}
            {label} {formatNutrient(expected[key])}
            {unit}
          </span>
        ))}
      </p>
    </div>
  )
}

export default function PlaceList({ places, todayTotal, recommended, deficientRows }) {
  if (!places || places.length === 0) return null

  return (
    <div>
      {places.map((place, i) => {
        const overageKeys = buildOverageKeys(place.expected, todayTotal, recommended)
        const reason = buildReason(place.expected, deficientRows)

        return (
          <div key={i} style={styles.card}>
            <h3>{place.place_name}</h3>
            <p style={{ margin: 0, color: colors.muted, fontSize: font.size.sm }}>{place.road_address_name}</p>
            <p style={{ margin: `${spacing.xs}px 0 0`, color: colors.body, fontSize: font.size.sm }}>
              {place.category_name?.split(' > ').pop()} · {place.distance}m
            </p>

            {place.representativeMenu && (
              <p style={{ margin: `${spacing.sm}px 0 0`, color: colors.textStrong, fontSize: font.size.sm }}>
                대표메뉴: <strong style={{ fontWeight: 700 }}>{place.representativeMenu}</strong>
              </p>
            )}

            {place.expected && <ExpectedNutrients expected={place.expected} overageKeys={overageKeys} />}

            {reason && (
              <p style={{ margin: `${spacing.sm}px 0 0`, color: colors.primary, fontSize: font.size.xs, fontWeight: 600 }}>
                추천 이유: {reason}
              </p>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: spacing.sm }}>
              <a
                href={place.place_url}
                target="_blank"
                rel="noreferrer"
                className="tds-press"
                style={{ ...styles.linkButton, whiteSpace: 'nowrap' }}
              >
                카카오맵에서 보기
              </a>
            </div>
          </div>
        )
      })}
    </div>
  )
}
