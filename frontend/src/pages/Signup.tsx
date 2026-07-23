import { type FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { signup } from '../api/auth'
import PersonalType, {
  type TastePreferences,
} from './PersonalType'
import './Login.css'

const INITIAL_PREFERENCES: TastePreferences = {
  spicy: 5,
  valueForMoney: 5,
  atmosphere: 5,
  waiting: 5,
  quietness: 5,
}

export default function Signup() {
  const navigate = useNavigate()
  const [step, setStep] = useState<1 | 2>(1)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [preferences, setPreferences] =
    useState<TastePreferences>(INITIAL_PREFERENCES)

  const handleNext = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')

    if (password !== passwordConfirmation) {
      setError('비밀번호가 서로 일치하지 않습니다.')
      return
    }

    setStep(2)
  }

  const handleSignup = async (selectedPreferences: TastePreferences) => {
    setError('')
    setIsSubmitting(true)
    try {
      const result = await signup(
        name.trim(),
        email.trim(),
        password,
        selectedPreferences,
      )
      navigate('/login', { replace: true, state: { message: result.message } })
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '회원가입에 실패했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (step === 2) {
    return (
      <PersonalType
        compact
        values={preferences}
        submitLabel="회원가입 완료하기"
        isSubmitting={isSubmitting}
        onChange={setPreferences}
        onBack={() => {
          setError('')
          setStep(1)
        }}
        onSubmit={handleSignup}
      />
    )
  }

  return (
    <main className="login-page">
      <section className="login-card login-card--signup" aria-labelledby="signup-title">
        <ol className="signup-progress" aria-label="회원가입 진행 단계">
          <li className="signup-progress__item signup-progress__item--active">
            <span>1</span> 계정 정보
          </li>
          <li className="signup-progress__line" aria-hidden="true" />
          <li className="signup-progress__item">
            <span>2</span> 취향 설정
          </li>
        </ol>

        <div className="login-card__heading">
          <span className="login-card__eyebrow">나만의 맛집 취향 찾기</span>
          <h1 id="signup-title" className="login-card__logo">
            Taste<span>Fit</span>
          </h1>
          <p>회원 정보를 입력해 계정을 만들어 주세요.</p>
        </div>

        <form className="login-form" onSubmit={handleNext}>
          <label className="login-form__field">
            <span>이름</span>
            <input value={name} minLength={2} required autoComplete="name" onChange={(event) => setName(event.target.value)} placeholder="이름을 입력해주세요" />
          </label>
          <label className="login-form__field">
            <span>이메일</span>
            <input type="email" value={email} required autoComplete="email" onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" />
          </label>
          <label className="login-form__field">
            <span>비밀번호</span>
            <input type="password" value={password} minLength={6} required autoComplete="new-password" onChange={(event) => setPassword(event.target.value)} placeholder="6자 이상 입력해주세요" />
          </label>
          <label className="login-form__field">
            <span>비밀번호 확인</span>
            <input type="password" value={passwordConfirmation} minLength={6} required autoComplete="new-password" onChange={(event) => setPasswordConfirmation(event.target.value)} placeholder="비밀번호를 한 번 더 입력해주세요" />
          </label>

          {error && <p className="login-form__error" role="alert">{error}</p>}

          <button className="login-form__submit" type="submit">
            다음: 취향 설정
          </button>
        </form>

        <Link className="login-card__signup" to="/login">
          이미 계정이 있나요? <strong>로그인</strong>
        </Link>
      </section>
    </main>
  )
}
