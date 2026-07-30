import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppButton from '../components/AppButton.jsx'
import Card from '../components/Card.jsx'
import ScreenHeader from '../components/ScreenHeader.jsx'
import TextField from '../components/TextField.jsx'
import { normalizeLoginId, validatePassword, validatePasswordConfirm } from '../lib/authId.js'
import { fetchSecurityQuestion, resetPasswordWithAnswer } from '../lib/forgotPassword.js'
import { validateSecurityAnswer } from '../lib/securityQuestions.js'
import { useDocumentTitle } from '../lib/useDocumentTitle.js'
import { colors, font, spacing, styles } from '../styles/theme.js'

const STEP = { ID: 'id', ANSWER: 'answer', DONE: 'done' }

// 비밀번호 찾기(FR-21, 보안 질문 방식) — 이메일이 없어 이메일 인증 재설정을 쓸 수 없는 이 앱의
// 유일한 자체 계정 복구 경로다. 3단계: ①아이디 입력 → 서버가 등록된 질문을 알려줌 ②답 + 새
// 비밀번호 입력 → 서버가 답을 검증하고(무차별 대입 방지는 서버 쪽 계정 단위 잠금이 담당) 통과하면
// 비밀번호를 직접 바꿔줌 ③완료 안내.
export default function ForgotPassword() {
  useDocumentTitle('비밀번호 찾기')
  const navigate = useNavigate()

  const [step, setStep] = useState(STEP.ID)
  const [loginId, setLoginId] = useState('')
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleFindQuestion(e) {
    e.preventDefault()
    setError('')
    const id = normalizeLoginId(loginId)
    if (!id) {
      setError('아이디를 입력해주세요.')
      return
    }

    setSubmitting(true)
    try {
      const result = await fetchSecurityQuestion(id)
      if (!result.found || !result.question) {
        setError('등록된 보안 질문을 찾을 수 없어요. 아이디를 다시 확인해주세요.')
        return
      }
      setQuestion(result.question)
      setStep(STEP.ANSWER)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleReset(e) {
    e.preventDefault()
    setError('')

    const answerError = validateSecurityAnswer(answer)
    const passwordError = validatePassword(newPassword)
    const confirmError = validatePasswordConfirm(newPassword, newPasswordConfirm)
    if (answerError || passwordError || confirmError) {
      setError(answerError || passwordError || confirmError)
      return
    }

    setSubmitting(true)
    try {
      await resetPasswordWithAnswer({ loginId: normalizeLoginId(loginId), answer, newPassword })
      setStep(STEP.DONE)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={styles.page}>
      <ScreenHeader title="비밀번호 찾기" onBack={() => navigate('/login')} />

      <Card>
        {step === STEP.ID && (
          <form onSubmit={handleFindQuestion} noValidate>
            <TextField
              label="아이디"
              id="fp-login-id"
              type="text"
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              value={loginId}
              onChange={(e) => setLoginId(normalizeLoginId(e.target.value))}
            />
            {error && <p style={styles.errorText}>{error}</p>}
            <AppButton type="submit" disabled={submitting || !loginId} style={{ marginTop: spacing.lg }}>
              {submitting ? '확인 중...' : '다음'}
            </AppButton>
          </form>
        )}

        {step === STEP.ANSWER && (
          <form onSubmit={handleReset} noValidate>
            <p style={{ margin: `0 0 ${spacing.md}px`, fontSize: font.size.md, fontWeight: 700, color: colors.textStrong }}>
              {question}
            </p>
            <TextField label="답변" id="fp-answer" type="text" value={answer} onChange={(e) => setAnswer(e.target.value)} />
            <TextField
              label="새 비밀번호"
              id="fp-new-password"
              type="password"
              autoComplete="new-password"
              placeholder="영문 + 숫자 8자 이상"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <TextField
              label="새 비밀번호 확인"
              id="fp-new-password-confirm"
              type="password"
              autoComplete="new-password"
              value={newPasswordConfirm}
              onChange={(e) => setNewPasswordConfirm(e.target.value)}
            />
            {error && <p style={styles.errorText}>{error}</p>}
            <AppButton type="submit" disabled={submitting} style={{ marginTop: spacing.lg }}>
              {submitting ? '변경 중...' : '비밀번호 변경'}
            </AppButton>
          </form>
        )}

        {step === STEP.DONE && (
          <div>
            <p style={{ margin: `0 0 ${spacing.lg}px`, fontSize: font.size.md, color: colors.textStrong }}>
              비밀번호가 변경됐어요. 새 비밀번호로 로그인해주세요.
            </p>
            <AppButton onClick={() => navigate('/login')}>로그인하러 가기</AppButton>
          </div>
        )}
      </Card>
    </div>
  )
}
