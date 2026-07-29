import { useEffect, useState } from 'react'
import { useUser } from '../context/UserContext.jsx'
import BadgeDexModal from './BadgeDexModal.jsx'
import Card from './Card.jsx'
import { getUnlockedBadgeIds } from '../lib/dataStore.js'
import { BADGES } from '../lib/badgeSystem.js'
import { colors, font, spacing, styles } from '../styles/theme.js'

// MY 탭 — 뱃지 도감 진입점(FR-13). 실제 잠금해제 판정+연출(playConfetti)은 BadgeDexModal이 열릴 때
// 한다 — 여기서는 현재 획득 개수만 가볍게 보여준다.
export default function BadgeShelfCard() {
  const { effectiveUserId } = useUser()
  const [unlockedCount, setUnlockedCount] = useState(null)
  const [showDex, setShowDex] = useState(false)

  useEffect(() => {
    let cancelled = false
    getUnlockedBadgeIds()
      .then((ids) => {
        if (!cancelled) setUnlockedCount(ids.length)
      })
      .catch(() => {
        if (!cancelled) setUnlockedCount(0)
      })
    return () => {
      cancelled = true
    }
  }, [effectiveUserId])

  if (unlockedCount === null) return null

  return (
    <>
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: font.size.md, fontWeight: 700, color: colors.textStrong }}>건강 달성 배지</h3>
            <p style={{ margin: `${spacing.xs}px 0 0`, fontSize: font.size.sm, color: colors.textSub }}>
              획득 배지 {unlockedCount}/{BADGES.length}개
            </p>
          </div>
          <button type="button" className="tds-press" onClick={() => setShowDex(true)} style={styles.buttonSecondary}>
            도감 보기
          </button>
        </div>
      </Card>

      {showDex && (
        <BadgeDexModal
          onClose={(nextUnlockedIds) => {
            if (nextUnlockedIds) setUnlockedCount(nextUnlockedIds.length)
            setShowDex(false)
          }}
        />
      )}
    </>
  )
}
