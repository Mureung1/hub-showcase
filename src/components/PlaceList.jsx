import { openExternalLink } from '../lib/externalLink.js'
import { useVisibleNutrients } from '../lib/cardSettings.js'
import { formatNutrient, NUTRIENT_LABELS } from '../lib/nutrition.js'
import { colors, font, spacing, styles } from '../styles/theme.js'

// 네이버(">")·카카오(" > ") 두 표기 모두 대응(카카오 검색 코드는 롤백용으로 남겨둠).
function lastCategory(categoryName) {
  const parts = (categoryName || '').split('>').map((s) => s.trim()).filter(Boolean)
  return parts[parts.length - 1] || ''
}

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
// overageKeys 판정(buildOverageKeys) 자체는 표시 설정과 무관하게 항상 전체 영양소 기준으로 유지된다 —
// 여기서는 그중 실제로 화면에 그릴 줄만 표시 설정으로 한 번 더 거른다.
function ExpectedNutrients({ expected, overageKeys }) {
  const visible = useVisibleNutrients()
  const rows = NUTRIENT_LABELS.filter(({ key }) => typeof expected[key] === 'number' && visible[key])
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

// 같은 식당을 같은 키로 취급(배열 인덱스 대신 이 값을 key로 써서, 검색 결과를 이어붙이거나 순서가
// 바뀌어도 React가 각 카드를 잘못된 DOM 노드에 재사용하지 않게 한다). MapPage.jsx도 동일한 규칙의
// 로컬 함수를 이미 갖고 있어(FR-18 듀얼 비교 선택 키로 재사용) 여기서는 export하지 않는다.
function placeIdentity(place) {
  return place.place_url || `${place.place_name}|${place.road_address_name}`
}

// selectable/selectedKeys/onToggleSelect: FR-18 지도 듀얼 비교의 다중 선택 모드. 기본값(selectable
// 생략)이면 체크박스가 전혀 렌더되지 않아 기존 동작과 100% 동일하다.
export default function PlaceList({ places, todayTotal, recommended, deficientRows, selectable = false, selectedKeys = [], onToggleSelect }) {
  if (!places || places.length === 0) return null

  return (
    <div>
      {places.map((place) => {
        // (식당 광고 카드 분기는 제거됐다 — PRD v2.0 §6에서 식당 광고가 이번 릴리즈 스코프 아웃됐고,
        //  검색 결과에는 더 이상 isAd 항목이 섞이지 않는다.)
        const overageKeys = buildOverageKeys(place.expected, todayTotal, recommended)
        const reason = buildReason(place.expected, deficientRows)
        const identity = placeIdentity(place)
        const selected = selectedKeys.includes(identity)

        return (
          <div key={identity} style={{ ...styles.card, position: 'relative' }}>
            {selectable && (
              <label
                style={{
                  position: 'absolute',
                  top: spacing.md,
                  right: spacing.md,
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing.xs,
                  fontSize: font.size.xs,
                  color: colors.textSub,
                  cursor: 'pointer',
                }}
              >
                <input type="checkbox" checked={selected} onChange={() => onToggleSelect(identity)} />
                비교 선택
              </label>
            )}
            <h3>{place.place_name}</h3>
            <p style={{ margin: 0, color: colors.muted, fontSize: font.size.sm }}>{place.road_address_name}</p>
            <p style={{ margin: `${spacing.xs}px 0 0`, color: colors.body, fontSize: font.size.sm }}>
              {lastCategory(place.category_name)} · {place.distance}m
              {/* FR-4 — 영양 충족도+거리 2요인 추천도. 네이버 응답엔 평점 필드가 없어 평점은 안 넣는다. */}
              {typeof place.score === 'number' && (
                <span style={{ marginLeft: spacing.sm, color: colors.primary, fontWeight: 600 }}>
                  · 추천도 {place.score}점
                </span>
              )}
            </p>

            {place.representativeMenu && (
              <p style={{ margin: `${spacing.sm}px 0 0`, color: colors.textStrong, fontSize: font.size.sm }}>
                대표메뉴: <strong style={{ fontWeight: 700 }}>{place.representativeMenu}</strong>
                {/* 6주차 §5 — 대중적으로 가격이 알려진 메뉴만 범위로 온다. 확신 없으면 priceRange 자체가
                    null이라 이 자리를 통째로 생략한다(단정 가격 표시 금지). */}
                {place.priceRange && (
                  <span style={{ color: colors.textSub, fontSize: font.size.xs, marginLeft: 6 }}>
                    약 {place.priceRange.min.toLocaleString()}~{place.priceRange.max.toLocaleString()}원 (추정)
                  </span>
                )}
              </p>
            )}

            {place.expected && <ExpectedNutrients expected={place.expected} overageKeys={overageKeys} />}

            {reason && (
              <p style={{ margin: `${spacing.sm}px 0 0`, color: colors.primary, fontSize: font.size.xs, fontWeight: 600 }}>
                추천 이유: {reason}
              </p>
            )}

            {place.place_url && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: spacing.sm }}>
                <a
                  href={place.place_url}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => {
                    e.preventDefault()
                    openExternalLink(place.place_url)
                  }}
                  className="tds-press"
                  style={{ ...styles.linkButton, whiteSpace: 'nowrap' }}
                >
                  네이버 지도에서 보기
                </a>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
