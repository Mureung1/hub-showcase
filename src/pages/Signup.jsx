import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext.jsx'
import AppButton from '../components/AppButton.jsx'
import Card from '../components/Card.jsx'
import ScreenHeader from '../components/ScreenHeader.jsx'
import TextField from '../components/TextField.jsx'
import {
  normalizeLoginId,
  validateLoginId,
  validateNickname,
  validatePassword,
  validatePasswordConfirm,
} from '../lib/authId.js'
import { useDocumentTitle } from '../lib/useDocumentTitle.js'
import { colors, font, radius, spacing, styles } from '../styles/theme.js'

// 회원가입(PRD v2.0 FR-1.1). 입력은 아이디/비밀번호/비밀번호 확인/닉네임 4개뿐이고, 통과하면 이메일
// 인증 같은 중간 단계 없이 곧바로 가입 + 자동 로그인 + 홈 진입까지 끝난다.
//
// 인라인 에러 표시 정책: 한 번이라도 손댔거나(blur) 제출을 시도한 필드만 에러를 보여준다 — 화면에
// 들어오자마자 빈 칸 4개에 빨간 글씨가 뜨는 걸 막으면서도, PRD가 요구하는 "실시간 인라인 에러"는
// 그대로 만족한다(비밀번호 확인은 입력하는 즉시 불일치가 보인다).
export default function Signup() {
  useDocumentTitle('회원가입')
  const { authUser, authLoading, signup } = useUser()
  const navigate = useNavigate()

  const [form, setForm] = useState({ loginId: '', password: '', passwordConfirm: '', nickname: '' })
  const [touched, setTouched] = useState({})
  // 서버가 알려준 필드별 에러(중복 아이디 등). 해당 필드를 다시 수정하면 지운다.
  const [serverFieldError, setServerFieldError] = useState({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // 가입이 성공하면 세션이 잡히고 authUser가 채워진다 — 그 순간 홈으로 보낸다(PRD: 즉시 홈 진입).
  useEffect(() => {
    if (authLoading || !authUser) return
    navigate('/analyze', { replace: true })
  }, [authLoading, authUser, navigate])

  const errors = {
    loginId: serverFieldError.loginId ?? validateLoginId(form.loginId),
    password: validatePassword(form.password),
    passwordConfirm: validatePasswordConfirm(form.password, form.passwordConfirm),
    nickname: validateNickname(form.nickname),
  }
  const isValid = Object.values(errors).every((e) => e === null)

  function updateField(key, value) {
    setForm((f) => ({ ...f, [key]: value }))
    setFormError('')
    if (serverFieldError[key]) setServerFieldError((prev) => ({ ...prev, [key]: undefined }))
  }

  function markTouched(key) {
    setTouched((t) => ({ ...t, [key]: true }))
  }

  // 아직 건드리지 않은 필드는 에러를 숨긴다. 단, 비밀번호 확인은 값이 들어오기 시작하면 바로 검사한다
  // (PRD FR-1.1: "불일치 시 실시간 인라인 에러").
  function errorFor(key) {
    const shown = touched[key] || (key === 'passwordConfirm' && form.passwordConfirm.length > 0)
    return shown ? (errors[key] ?? undefined) : undefined
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setTouched({ loginId: true, password: true, passwordConfirm: true, nickname: true })
    setFormError('')
    if (!isValid || submitting) return

    setSubmitting(true)
    try {
      await signup(form)
      // 성공하면 세션이 잡히는 즉시 위 useEffect가 홈으로 이동시킨다.
    } catch (err) {
      // signup은 어느 필드 문제인지 아는 경우 err.field를 실어 보낸다(예: 중복 아이디).
      if (err.field) {
        setServerFieldError((prev) => ({ ...prev, [err.field]: err.message }))
        setTouched((t) => ({ ...t, [err.field]: true }))
      } else {
        setFormError(err.message)
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={styles.page}>
      <ScreenHeader
        title="회원가입"
        subtitle="아이디와 비밀번호만 있으면 바로 시작할 수 있어요"
        onBack={() => navigate('/login')}
      />

      <Card>
        <form onSubmit={handleSubmit} noValidate>
          <TextField
            label="아이디"
            id="signup-id"
            type="text"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder="영문 소문자 + 숫자 4~20자"
            value={form.loginId}
            onChange={(e) => updateField('loginId', normalizeLoginId(e.target.value))}
            onBlur={() => markTouched('loginId')}
            error={errorFor('loginId')}
          />
          <TextField
            label="비밀번호"
            id="signup-password"
            type="password"
            autoComplete="new-password"
            placeholder="영문 + 숫자 8자 이상"
            value={form.password}
            onChange={(e) => updateField('password', e.target.value)}
            onBlur={() => markTouched('password')}
            error={errorFor('password')}
          />
          <TextField
            label="비밀번호 확인"
            id="signup-password-confirm"
            type="password"
            autoComplete="new-password"
            value={form.passwordConfirm}
            onChange={(e) => updateField('passwordConfirm', e.target.value)}
            onBlur={() => markTouched('passwordConfirm')}
            error={errorFor('passwordConfirm')}
          />
          <TextField
            label="닉네임"
            id="signup-nickname"
            type="text"
            autoComplete="nickname"
            placeholder="12자 이하"
            value={form.nickname}
            onChange={(e) => updateField('nickname', e.target.value)}
            onBlur={() => markTouched('nickname')}
            error={errorFor('nickname')}
          />

          {/* PRD FR-1.1 필수 고지: 이메일이 없어 비밀번호 재설정 경로 자체가 없다는 걸 가입 전에 알린다. */}
          <div
            style={{
              background: colors.deficientSurface,
              borderRadius: radius.sm,
              padding: spacing.md,
              marginTop: spacing.sm,
            }}
          >
            <p style={{ margin: 0, fontSize: font.size.sm, color: colors.textStrong, fontWeight: 600 }}>
              비밀번호를 잊으면 계정을 복구할 수 없습니다. 안전한 곳에 보관해주세요.
            </p>
          </div>

          {formError && <p style={styles.errorText}>{formError}</p>}

          <AppButton type="submit" disabled={submitting} style={{ marginTop: spacing.lg }}>
            {submitting ? '가입 중...' : '가입하기'}
          </AppButton>
        </form>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: spacing.xs,
            marginTop: spacing.lg,
          }}
        >
          <span style={{ fontSize: font.size.sm, color: colors.textSub }}>이미 계정이 있으신가요?</span>
          <button type="button" className="tds-press" onClick={() => navigate('/login')} style={styles.linkButton}>
            로그인
          </button>
        </div>
      </Card>
    </div>
  )
}
