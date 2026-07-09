import { formatExpectedIntake } from '../lib/nutrition.js'
import { colors, font, spacing, styles } from '../styles/theme.js'

// "대표메뉴: 쇠고기국밥 · 단백질 18g · 지방 4g 섭취 가능" 형태로, 예상 섭취량이 어떤 메뉴에서 나온 값인지 출처를 함께 보여준다.
function buildSourceCaption(place) {
  const parts = []
  if (place.representativeMenu) parts.push(`대표메뉴: ${place.representativeMenu}`)
  const expectedText = formatExpectedIntake(place.expected)
  if (expectedText) parts.push(expectedText)
  return parts.length > 0 ? parts.join(' · ') : null
}

export default function PlaceList({ places }) {
  if (!places || places.length === 0) return null

  return (
    <div>
      {places.map((place, i) => {
        const sourceCaption = buildSourceCaption(place)
        return (
          <div key={i} style={styles.card}>
            <h3>{place.place_name}</h3>
            <p style={{ margin: 0, color: colors.muted, fontSize: font.size.sm }}>{place.road_address_name}</p>
            {sourceCaption && (
              <p style={{ margin: `${spacing.sm}px 0 0`, color: colors.muted, fontSize: font.size.xs, fontWeight: 400 }}>
                {sourceCaption}
              </p>
            )}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: spacing.sm,
                gap: spacing.sm,
              }}
            >
              <span style={{ color: colors.body, fontSize: font.size.sm }}>
                {place.category_name?.split(' > ').pop()} · {place.distance}m
              </span>
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
