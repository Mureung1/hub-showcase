import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext.jsx'
import { colors, spacing, font, styles } from '../styles/theme.js'

// 로고 = 심볼 이미지 + 워드마크 텍스트. 워드마크를 이미지로 합치지 않고 텍스트로 두는 이유:
// 어떤 화면 배율에서도 또렷하고(래스터 확대 흐림 없음), 폰트가 앱 전체와 같은 Pretendard로 맞아떨어지며,
// 스크린리더가 앱 이름을 그대로 읽는다.
// 심볼 높이(36px)는 기존 값을 그대로 유지하고, 글자 크기는 심볼 대비 원본 로고의 비율에 맞춰 잡았다.
// 이미지가 없거나 로드에 실패하면 심볼만 사라지고 워드마크는 남아, 상단이 텅 비어 보이지 않는다.
const LOGO_SYMBOL_HEIGHT = 36

function HeaderLogo() {
  const [failed, setFailed] = useState(false)

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
      {!failed && (
        <img
          src="/logo-symbol.png"
          // 바로 옆 워드마크가 이미 "Mealyze"를 읽어주므로 이미지는 장식으로 둔다
          // (alt를 채우면 스크린리더가 "Mealyze Mealyze"로 두 번 읽는다).
          alt=""
          aria-hidden="true"
          onError={() => setFailed(true)}
          style={{ height: LOGO_SYMBOL_HEIGHT, display: 'block', flexShrink: 0 }}
        />
      )}
      <span
        style={{
          fontWeight: 800,
          fontSize: font.size.xl,
          lineHeight: 1,
          color: colors.brandInk,
          letterSpacing: '-0.02em',
          whiteSpace: 'nowrap',
        }}
      >
        Mealyze
      </span>
    </div>
  )
}

// 게스트도 항상 헤더를 본다 — 로그인 계정이면 닉네임+로그아웃, 게스트면 로그인/회원가입 진입 버튼을
// 보여준다(로그인/회원가입 화면 자체에서는 중복이라 버튼을 숨긴다). authLoading 중(세션 복원 전)에는
// 오른쪽을 비워둔다 — authMode는 세션이 없을 때도 'guest'이므로, 이 체크가 없으면 실제로는 로그인된
// 사용자에게 새로고침마다 잠깐 "게스트로 이용 중"이 잘못 보였다가 닉네임으로 바뀌는 깜빡임이 생긴다.
const AUTH_PATHS = ['/login', '/signup']
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
        gap: spacing.sm,
        // 웹뷰 앱에서 상단 상태바(노치)와 겹치지 않도록 안전영역만큼 위 여백을 더한다(웹에선 0이라 무변화).
        padding: `calc(${spacing.md}px + env(safe-area-inset-top)) ${spacing.lg}px ${spacing.md}px`,
        background: colors.surface,
        overflow: 'hidden',
      }}
    >
      <HeaderLogo />
      {authLoading ? null : authMode === 'user' ? (
        <div style={rightGroupStyle}>
          <span style={labelStyle}>{authUser.displayName}님</span>
          <button type="button" className="tds-press" onClick={handleLogout} style={{ ...styles.buttonSecondary, flexShrink: 0 }}>
            로그아웃
          </button>
        </div>
      ) : (
        !AUTH_PATHS.includes(location.pathname) && (
          <div style={rightGroupStyle}>
            {/* tds-header-note: 좁은 화면에서는 숨긴다(index.css) — 자세한 이유는 그쪽 주석 참고. */}
            <span className="tds-header-note" style={labelStyle}>
              게스트로 이용 중
            </span>
            <button
              type="button"
              className="tds-press"
              onClick={() => navigate('/login')}
              style={{ ...styles.buttonSecondary, flexShrink: 0, whiteSpace: 'nowrap' }}
            >
              로그인 / 회원가입
            </button>
          </div>
        )
      )}
    </header>
  )
}

// 좁은 화면(폭 360px대 안드로이드 등)에서 오른쪽 버튼이 화면 밖으로 밀려 잘리지 않게 한다.
// 줄어드는 순서를 명시적으로 정한 것: 버튼은 절대 줄지 않고(flexShrink: 0), 공간이 모자라면
// 안내 문구("게스트로 이용 중"/"홍길동님")가 먼저 말줄임된다 — 문구는 없어도 되지만 버튼은 눌러야 하므로.
const rightGroupStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: spacing.sm,
  minWidth: 0,
  flexShrink: 1,
}

const labelStyle = {
  fontSize: font.size.sm,
  color: colors.muted,
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}
