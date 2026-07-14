import { useNavigate } from 'react-router-dom'
import { useAppState } from '../context/AppStateContext.jsx'
import Card from '../components/Card.jsx'
import PillButton from '../components/PillButton.jsx'

export default function LoginPage() {
  const { isLoggedIn, login, logout, currentUser, authLoading, authError } = useAppState()
  const navigate = useNavigate()

  if (authLoading) {
    return (
      <Card variant="glass" style={{ marginTop: 40 }}>
        <p style={{ fontSize: 13.5, color: 'var(--ink-mute)' }}>로그인 상태를 확인하는 중이에요…</p>
      </Card>
    )
  }

  if (isLoggedIn) {
    return (
      <Card variant="glass">
        <div className="eyebrow">번개모임</div>
        <h1 className="section-title" style={{ fontSize: 22 }}>
          이미 로그인 중이에요
        </h1>
        <p style={{ fontSize: 13.5, color: 'var(--ink-mute)' }}>
          {currentUser.nickname}님으로 로그인되어 있어요.
        </p>
        <PillButton variant="primary" block onClick={() => navigate('/')}>
          홈으로 가기
        </PillButton>
        <PillButton variant="ghost" size="sm" onClick={logout}>
          로그아웃
        </PillButton>
      </Card>
    )
  }

  return (
    <>
      <Card variant="glass" style={{ marginTop: 40 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span className="eyebrow">번개모임</span>
          <span className="eyebrow">Sign up</span>
        </div>

        <h1 className="section-title" style={{ fontSize: 28, marginTop: 18 }}>
          로그인
        </h1>
        <p style={{ fontSize: 13.5, color: 'var(--ink-mute)' }}>
          구글이나 카카오 계정으로 1초 만에 시작하세요. 최초 로그인 시 생년월일을 추가로 입력받아요.
        </p>

        {authError && (
          <p
            role="alert"
            style={{
              fontSize: 13,
              color: 'var(--danger, #c0392b)',
              background: 'rgba(192, 57, 43, 0.08)',
              borderRadius: 12,
              padding: '10px 12px',
              marginTop: 6,
            }}
          >
            {authError}
          </p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 6 }}>
          <PillButton variant="primary" block onClick={() => login('google')}>
            구글로 계속하기
          </PillButton>
          <PillButton variant="accent" block onClick={() => login('kakao')}>
            카카오로 계속하기
          </PillButton>
        </div>

        <p style={{ fontSize: 11.5, color: 'var(--ink-mute)', lineHeight: 1.5, marginTop: 4 }}>
          만 14세 미만은 서비스 이용이 제한될 수 있어요. 계속 진행하면 이용약관과 개인정보 처리방침에 동의하는
          것으로 간주됩니다.
        </p>
      </Card>
    </>
  )
}
