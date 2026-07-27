// 직업 맞춤 추천 카드 목록(FR-2.2/2.3). PlaceList(부족 영양소 추천)와 데이터 모양은 같지만 예상
// 섭취량 계산이 없어 훨씬 단순하다 — 두 목록을 억지로 하나로 합치지 않고 별도 컴포넌트로 둔다.
import { openExternalLink } from '../lib/externalLink.js'
import { colors, font, spacing, styles } from '../styles/theme.js'

function lastCategory(categoryName) {
  const parts = (categoryName || '').split('>').map((s) => s.trim()).filter(Boolean)
  return parts[parts.length - 1] || ''
}

// PlaceList.jsx/MapPage.jsx의 placeIdentity와 동일한 규칙(같은 식당을 같은 키로 취급).
function placeIdentity(place) {
  return place.place_url || `${place.place_name}|${place.road_address_name}`
}

// nutrientPlaceIds: 부족 영양소 추천에도 동시에 뜬 식당의 identity 집합 — 겹치면 두 추천 사유를
// 함께 보여준다("중복 해당 식당은 상세 카드에 두 사유 모두 표시", FR-2.3).
export default function OccupationPlaceList({ places, nutrientPlaceIds }) {
  if (!places || places.length === 0) return null

  return (
    <div>
      <h3 style={{ fontSize: font.size.md, fontWeight: 700, margin: `${spacing.md}px 0 ${spacing.sm}px`, color: colors.textStrong }}>
        직업 맞춤 추천
      </h3>
      {places.map((place) => {
        const alsoNutrientMatch = nutrientPlaceIds?.has(placeIdentity(place))
        return (
          <div key={placeIdentity(place)} style={styles.card}>
            <h3>{place.place_name}</h3>
            <p style={{ margin: 0, color: colors.muted, fontSize: font.size.sm }}>{place.road_address_name}</p>
            <p style={{ margin: `${spacing.xs}px 0 0`, color: colors.body, fontSize: font.size.sm }}>
              {lastCategory(place.category_name)} · {place.distance}m
            </p>
            <p style={{ margin: `${spacing.sm}px 0 0`, color: colors.info, fontSize: font.size.xs, fontWeight: 600 }}>
              추천 이유: &apos;{place.matchedKeyword}&apos; 직업 맞춤 추천
              {alsoNutrientMatch ? ' · 부족한 영양소도 채울 수 있어요' : ''}
            </p>
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
