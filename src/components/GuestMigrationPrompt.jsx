import { useUser } from '../context/UserContext.jsx'
import AppButton from './AppButton.jsx'
import Card from './Card.jsx'
import { useFocusTrap } from '../lib/useFocusTrap.js'
import { colors, font, spacing, styles } from '../styles/theme.js'

// 게스트로 쓰던 중 로그인/회원가입하면 뜨는 1회성 확인 모달. UserContext.migrationPrompt가 null이
// 아닐 때만 어느 화면 위에든 오버레이로 뜬다(router.jsx에서 Header 바로 아래, 전역에 렌더).
export default function GuestMigrationPrompt() {
  const { migrationPrompt, migrating, migrationError, acceptGuestMigration, declineGuestMigration } = useUser()
  const containerRef = useFocusTrap(Boolean(migrationPrompt), migrating ? undefined : declineGuestMigration)

  if (!migrationPrompt) return null

  const parts = []
  if (migrationPrompt.hasProfile) parts.push('신체정보')
  if (migrationPrompt.mealDayCount > 0) parts.push(`식단 ${migrationPrompt.mealDayCount}일치`)
  const summary = parts.join(', ')

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="guest-migration-title"
      ref={containerRef}
      tabIndex={-1}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(25, 31, 40, 0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.xl,
        zIndex: 100,
      }}
    >
      <Card style={{ maxWidth: 360, width: '100%', margin: 0 }}>
        <h3 id="guest-migration-title" style={{ fontSize: font.size.lg, margin: `0 0 ${spacing.sm}px`, color: colors.textStrong }}>
          기존 게스트 데이터를 계정에 저장할까요?
        </h3>
        <p style={{ margin: `0 0 ${spacing.lg}px`, color: colors.textSub, fontSize: font.size.sm }}>
          로그인하지 않고 이용하는 동안 이 기기에 {summary}가 남아있어요. 지금 계정으로 옮기면 다른
          기기에서 로그인해도 이어서 볼 수 있어요. 식단 기록은 계정에 이미 있는 기록에 추가되고,
          신체정보는 계정에 아직 없을 때만 채워져요(계정에 이미 저장된 신체정보는 덮어쓰지 않아요).
          옮기지 않아도 계정 데이터만으로 계속 이용할 수 있고, 이 기기의 게스트 데이터는 그대로
          남아있어요.
        </p>

        {migrationError && <p style={{ ...styles.errorText, margin: `0 0 ${spacing.md}px` }}>{migrationError}</p>}

        <div style={{ display: 'flex', gap: spacing.sm }}>
          <AppButton variant="secondary" onClick={declineGuestMigration} disabled={migrating} style={{ flex: 1 }}>
            아니요
          </AppButton>
          <AppButton onClick={acceptGuestMigration} disabled={migrating} style={{ flex: 1 }}>
            {migrating ? '저장 중...' : migrationError ? '다시 시도' : '저장하기'}
          </AppButton>
        </div>
      </Card>
    </div>
  )
}
