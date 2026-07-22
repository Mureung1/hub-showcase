import { useEffect } from 'react'
import Card from './Card.jsx'
import { COUPANG_DISCLOSURE } from '../data/coupangProducts.js'
import { trackAdClick, trackAdImpression } from '../lib/adData.js'
import { openExternalLink } from '../lib/externalLink.js'
import { colors, font, spacing, styles } from '../styles/theme.js'

// "AD" 배지 + 쿠팡 파트너스 필수 고지를 포함한 세로형 광고 카드(결과 화면의 "가장 부족한 영양소" 아래).
// 식단 탭의 가로 캐러셀(DeficientNutrientAds.jsx)과는 형태만 다르고 같은 상품 데이터를 쓴다.
// 표시광고법: 광고임을 명확히 표시해야 하므로 AD 배지와 고지 문구는 어떤 상태에서도 생략하지 않는다.
export default function AdCard({ adId, title, note, link, children }) {
  // 노출 집계(FR-3.3). 같은 광고가 다시 마운트되면 다시 세는데, 화면 진입 자체가 새 노출이므로 맞다.
  useEffect(() => {
    trackAdImpression(adId)
  }, [adId])

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
        rel="noreferrer sponsored nofollow"
        onClick={(e) => {
          e.preventDefault()
          trackAdClick(adId)
          openExternalLink(link)
        }}
        className="tds-press"
        style={{ ...styles.linkButton, display: 'inline-block', marginTop: spacing.sm }}
      >
        자세히 보기
      </a>

      {/* 쿠팡 파트너스 필수 고지 — 문구 변경/생략 금지(PRD FR-3.1). */}
      <p style={{ margin: `${spacing.sm}px 0 0`, fontSize: font.size.xs, color: colors.muted, lineHeight: 1.5 }}>
        {COUPANG_DISCLOSURE}
      </p>
    </Card>
  )
}
