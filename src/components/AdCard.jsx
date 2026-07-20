import Card from './Card.jsx'
import { trackAdClick } from '../lib/adData.js'
import { colors, font, spacing, styles } from '../styles/theme.js'

// "AD" 배지 + 고지 문구를 포함한 공용 광고 카드. 표시상소재(스폰서 식당/보충제 등)가 바뀌어도
// 이 컴포넌트는 그대로 재사용한다. 표시상거래법: 광고임을 명확히 표시해야 하므로 배지는 항상 보인다.
export default function AdCard({ adId, title, note, link, children }) {
  return (
    <Card style={{ border: `1px solid ${colors.border}`, boxShadow: 'none' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm }}>
        <span
          style={{
            fontSize: font.size.xs,
            fontWeight: 700,
            color: colors.muted,
            border: `1px solid ${colors.border}`,
            borderRadius: 4,
            padding: '1px 6px',
          }}
        >
          AD
        </span>
        <h3 style={{ margin: 0, fontSize: font.size.md, color: colors.textStrong }}>{title}</h3>
      </div>

      {note && <p style={{ margin: `0 0 ${spacing.sm}px`, fontSize: font.size.sm, color: colors.textSub }}>{note}</p>}

      {children}

      <a
        href={link}
        target="_blank"
        rel="noreferrer sponsored"
        onClick={() => trackAdClick(adId)}
        className="tds-press"
        style={{ ...styles.linkButton, display: 'inline-block', marginTop: spacing.sm }}
      >
        자세히 보기
      </a>

      <p style={{ margin: `${spacing.sm}px 0 0`, fontSize: font.size.xs, color: colors.muted }}>
        본 링크는 제휴 링크이며, 구매 시 일정 수수료를 받을 수 있습니다.
      </p>
    </Card>
  )
}
