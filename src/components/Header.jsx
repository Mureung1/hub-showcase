import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext.jsx'
import { colors, spacing, font, styles } from '../styles/theme.js'

// 로고는 영어 워드마크 없이 심볼 이미지만 쓴다(요청: 영어 글씨 제거, 더 크게). 이미지가 없거나 로드에
// 실패하면 앱 이름 텍스트로 폴백해, 상단이 텅 비어 보이지 않게 한다.
function HeaderLogo() {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return (
      <span style={{ fontWeight: 800, fontSize: font.size.lg, color: colors.primary, letterSpacing: '-0.02em' }}>Mealyze</span>
    )
  }

  return <img src="/logo-symbol.png" alt="Mealyze" onError={() => setFailed(true)} style={{ height: 36, display: 'block' }} />
}

// 게스트도 항상 헤더를 본다 — 로그인 계정이면 이메일+로그아웃, 게스트면 로그인/회원가입 진입 버튼을
// 보여준다(로그인 화면 자체에서는 중복이라 버튼을 숨긴다). authLoading 중(세션 복원 전)에는 오른쪽을
// 비워둔다 — authMode는 세션이 없을 때도 'guest'이므로, 이 체크가 없으면 실제로는 로그인된 사용자에게
// 새로고침마다 잠깐 "게스트로 이용 중"이 잘못 보였다가 이메일로 바뀌는 깜빡임이 생긴다.
export default function Header() {
  const { authUser, authMode, authLoading, logout } = useUser()
  const navigate = useNavigate()
  const location = useLocation()

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <header
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        // 웹뷰 앱에서 상단 상태바(노치)와 겹치지 않도록 안전영역만큼 위 여백을 더한다(웹에선 0이라 무변화).
        padding: `calc(${spacing.md}px + env(safe-area-inset-top)) ${spacing.lg}px ${spacing.md}px`,
        background: colors.surface,
      }}
    >
      <HeaderLogo />
      {authLoading ? null : authMode === 'user' ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
          <span style={{ fontSize: font.size.sm, color: colors.muted }}>{authUser.email}님</span>
          <button type="button" className="tds-press" onClick={handleLogout} style={styles.buttonSecondary}>
            로그아웃
          </button>
        </div>
      ) : (
        location.pathname !== '/login' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
            <span style={{ fontSize: font.size.sm, color: colors.muted }}>게스트로 이용 중</span>
            <button type="button" className="tds-press" onClick={() => navigate('/login')} style={styles.buttonSecondary}>
              로그인 / 회원가입
            </button>
          </div>
        )
      )}
    </header>
  )
}
