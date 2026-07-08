import { colors, font, spacing, styles } from '../styles/theme.js'

export default function PlaceList({ places }) {
  if (!places || places.length === 0) return null

  return (
    <div>
      {places.map((place, i) => (
        <div key={i} style={styles.card}>
          <h3>{place.place_name}</h3>
          <p style={{ margin: 0, color: colors.muted, fontSize: font.size.sm }}>{place.road_address_name}</p>
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
      ))}
    </div>
  )
}
