import Card from './Card.jsx'
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

// 부족 영양소(top3Rows) 중 이 식당의 예상 섭취량(expected)이 실제로 값을 갖고 있는 키만 — 태그
// 강조(ExpectedNutrients)와 추천 이유 문장(buildReason)이 "커버 여부" 판정을 공유한다.
function coveredDeficientKeys(expected, deficientRows) {
  if (!expected || !deficientRows) return new Set()
  return new Set(deficientRows.filter((row) => typeof expected[row.key] === 'number').map((row) => row.key))
}

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

// "이 메뉴를 먹으면 어떤 영양소가 넘치는지"를 색으로 보여주는 예상 섭취량 태그 배열(지도·달력 모바일
// 개편 3안 — 기존엔 한 줄짜리 텍스트였다). overageKeys 판정(buildOverageKeys) 자체는 표시 설정과
// 무관하게 항상 전체 영양소 기준으로 유지된다 — 여기서는 그중 실제로 그릴 태그만 표시 설정으로
// 한 번 더 거른다. 부족 영양소를 채워주는 태그(highlight)만 그린 톤으로 강조한다.
function ExpectedNutrients({ expected, overageKeys, highlightKeys }) {
  const visible = useVisibleNutrients()
  const rows = NUTRIENT_LABELS.filter(({ key }) => typeof expected[key] === 'number' && visible[key])
  if (rows.length === 0) return null

  return (
    <div style={{ display: 'flex', gap: 6, marginTop: spacing.sm, flexWrap: 'wrap' }}>
      {rows.map(({ key, label, unit }) => {
        const over = overageKeys.has(key)
        const on = !over && highlightKeys.has(key)
        return (
          <span
            key={key}
            style={{
              fontSize: 11.5,
              fontWeight: 600,
              padding: '5px 9px',
              borderRadius: 8,
              background: over ? colors.dangerSurface : on ? colors.primarySurface : colors.bg,
              color: over ? colors.dangerText : on ? colors.primaryDark : colors.textSub,
              whiteSpace: 'nowrap',
            }}
          >
            {label} {formatNutrient(expected[key])}
            {unit}
          </span>
        )
      })}
    </div>
  )
}

// 같은 식당을 같은 키로 취급(배열 인덱스 대신 이 값을 key로 써서, 검색 결과를 이어붙이거나 순서가
// 바뀌어도 React가 각 카드를 잘못된 DOM 노드에 재사용하지 않게 한다). MapPage.jsx도 동일한 규칙의
// 로컬 함수를 이미 갖고 있어(FR-18 듀얼 비교 선택 키로 재사용) 여기서는 export하지 않는다.
function placeIdentity(place) {
  return place.place_url || `${place.place_name}|${place.road_address_name}`
}

// 추천 배지 색 — 이 목록 안에서 실제로 점수가 가장 높은 카드 1장만 채워진 그린(top pick), 나머지
// 점수 있는 카드는 회색 필로 표시한다. 점수 자체가 없는 카드(직업 맞춤 추천 — attachExpectedIntake를
// 안 거쳐 place.score가 없음, MapPage.jsx 주석 참고)는 배지 자체를 안 그린다.
function RecommendBadge({ score, top }) {
  if (typeof score !== 'number') return null
  return (
    <span
      style={{
        flexShrink: 0,
        fontSize: 12,
        fontWeight: 700,
        padding: '3px 8px',
        borderRadius: 20,
        whiteSpace: 'nowrap',
        background: top ? colors.primary : colors.bg,
        color: top ? '#fff' : colors.textSub,
      }}
    >
      추천 {score}
    </span>
  )
}

function PlaceCard({ place, top, todayTotal, recommended, deficientRows, selectable, selected, onToggleSelect }) {
  const overageKeys = buildOverageKeys(place.expected, todayTotal, recommended)
  const highlightKeys = coveredDeficientKeys(place.expected, deficientRows)
  const reason = buildReason(place.expected, deficientRows)
  const priceText = place.priceRange ? `${place.priceRange.min.toLocaleString()}~${place.priceRange.max.toLocaleString()}원` : null

  return (
    <Card flat style={{ position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm }}>
        <h3 style={{ margin: 0, fontSize: 14.5, fontWeight: 800, color: colors.textStrong, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {place.place_name}
        </h3>
        <RecommendBadge score={place.score} top={top} />
      </div>

      <p style={{ margin: '5px 0 0', color: colors.muted, fontSize: font.size.xs, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {[lastCategory(place.category_name), `${place.distance.toLocaleString()}m`, priceText].filter(Boolean).join(' · ')}
      </p>

      {place.representativeMenu && (
        <p style={{ margin: `${spacing.xs}px 0 0`, color: colors.textStrong, fontSize: font.size.sm }}>
          대표메뉴: <strong style={{ fontWeight: 700 }}>{place.representativeMenu}</strong>
        </p>
      )}

      {place.expected && <ExpectedNutrients expected={place.expected} overageKeys={overageKeys} highlightKeys={highlightKeys} />}

      {reason && (
        <p style={{ margin: `${spacing.sm}px 0 0`, color: colors.primary, fontSize: 11.5, fontWeight: 600 }}>{reason}</p>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.sm }}>
        {selectable ? (
          <label style={{ display: 'flex', alignItems: 'center', gap: spacing.xs, fontSize: font.size.xs, color: colors.textSub, cursor: 'pointer' }}>
            <input type="checkbox" checked={selected} onChange={onToggleSelect} />
            비교 선택
          </label>
        ) : (
          <span />
        )}
        {place.place_url && (
          <a
            href={place.place_url}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => {
              e.preventDefault()
              openExternalLink(place.place_url)
            }}
            className="tds-press"
            style={{ ...styles.linkButton, whiteSpace: 'nowrap', fontSize: font.size.xs }}
          >
            네이버 지도에서 보기
          </a>
        )}
      </div>
    </Card>
  )
}

// selectable/selectedKeys/onToggleSelect: FR-18 지도 듀얼 비교의 다중 선택 모드. 기본값(selectable
// 생략)이면 체크박스가 전혀 렌더되지 않아 기존 동작과 100% 동일하다.
export default function PlaceList({ places, todayTotal, recommended, deficientRows, selectable = false, selectedKeys = [], onToggleSelect }) {
  if (!places || places.length === 0) return null

  // "top pick" 배지 — 점수가 있는 카드들 중 최고점 하나만(동점이면 그 점수를 가진 전부, 드물지만
  // 사용자 입장에서 "왜 얘만 초록이지"보다 자연스럽다).
  const maxScore = places.reduce((max, p) => (typeof p.score === 'number' && p.score > max ? p.score : max), -Infinity)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {places.map((place) => {
        // (식당 광고 카드 분기는 제거됐다 — PRD v2.0 §6에서 식당 광고가 이번 릴리즈 스코프 아웃됐고,
        //  검색 결과에는 더 이상 isAd 항목이 섞이지 않는다.)
        const identity = placeIdentity(place)
        return (
          <PlaceCard
            key={identity}
            place={place}
            top={typeof place.score === 'number' && place.score === maxScore}
            todayTotal={todayTotal}
            recommended={recommended}
            deficientRows={deficientRows}
            selectable={selectable}
            selected={selectedKeys.includes(identity)}
            onToggleSelect={() => onToggleSelect(identity)}
          />
        )
      })}
    </div>
  )
}
