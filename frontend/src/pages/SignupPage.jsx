import { useState } from 'react'
import axios from 'axios'
import logo from '../assets/logo.svg'
import loginBg from '../assets/illustrations/login-bg.png'
import './SignupPage.css'

export default function SignupPage() {
  const [id, setId] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  const [gender, setGender] = useState('')
  const [nickname, setNickname] = useState('')
  const [schoolEmail, setSchoolEmail] = useState('')

  const [idCheckMessage, setIdCheckMessage] = useState('')
  const [idCheckStatus, setIdCheckStatus] = useState('')
  const [signupMessage, setSignupMessage] = useState('')
  const [signupStatus, setSignupStatus] = useState('')

  const handleCheckId = async () => {
    try {
      const response = await axios.post('http://localhost:4000/api/auth/check-username', {
        username: id,
      })
      if (response.data.available) {
        setIdCheckStatus('success')
        setIdCheckMessage('사용 가능한 아이디입니다')
      } else {
        setIdCheckStatus('error')
        setIdCheckMessage('이미 사용 중인 아이디입니다')
      }
    } catch (error) {
      setIdCheckStatus('error')
      setIdCheckMessage(error.response?.data?.message ?? '중복확인 중 오류가 발생했습니다')
    }
  }

  const handleVerifyEmail = () => {
    console.log('인증하기', schoolEmail)
  }

  const handleSignup = async () => {
    try {
      const response = await axios.post('http://localhost:4000/api/auth/signup', {
        username: id,
        password,
        passwordConfirm,
        name,
        age: Number(age),
        gender,
        nickname,
        schoolEmail,
      })
      if (response.status === 201) {
        setSignupStatus('success')
        setSignupMessage('회원가입이 완료되었습니다')
      }
    } catch (error) {
      setSignupStatus('error')
      setSignupMessage(error.response?.data?.message ?? '회원가입 중 오류가 발생했습니다')
    }
  }

  return (
    <div className="signup-page" style={{ backgroundImage: `url(${loginBg})` }}>
      <div className="signup-brand">
        <img src={logo} alt="우리결 로고" className="signup-brand-logo" />
        <span className="signup-brand-name">우리결</span>
      </div>
      <h1 className="signup-title">회원가입</h1>

      <div className="signup-card">
        <div className="signup-row">
          <input
            type="text"
            placeholder="아이디"
            value={id}
            onChange={(e) => setId(e.target.value)}
            className="signup-input"
          />
          <button type="button" className="signup-button-coral signup-button-fixed" onClick={handleCheckId}>
            중복확인
          </button>
        </div>
        {idCheckMessage && (
          <p className={`signup-message signup-message-${idCheckStatus}`}>{idCheckMessage}</p>
        )}

        <input
          type="password"
          placeholder="비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="signup-input"
        />

        <input
          type="password"
          placeholder="비밀번호 확인"
          value={passwordConfirm}
          onChange={(e) => setPasswordConfirm(e.target.value)}
          className="signup-input"
        />

        <div className="signup-row">
          <input
            type="text"
            placeholder="이름"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="signup-input"
          />
          <input
            type="number"
            placeholder="나이"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            className="signup-input"
          />
        </div>

        <div className="signup-row">
          <button
            type="button"
            className={`signup-gender-button ${gender === 'male' ? 'selected' : ''}`}
            onClick={() => setGender('male')}
          >
            남성
          </button>
          <button
            type="button"
            className={`signup-gender-button ${gender === 'female' ? 'selected' : ''}`}
            onClick={() => setGender('female')}
          >
            여성
          </button>
        </div>

        <input
          type="text"
          placeholder="사용할 닉네임"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          className="signup-input"
        />

        <div className="signup-row">
          <input
            type="email"
            placeholder="학교 이메일 (.ac.kr)"
            value={schoolEmail}
            onChange={(e) => setSchoolEmail(e.target.value)}
            className="signup-input"
          />
          <button type="button" className="signup-button-mint signup-button-fixed" onClick={handleVerifyEmail}>
            인증하기
          </button>
        </div>

        <button type="button" className="signup-submit-button" onClick={handleSignup}>
          가입하기
        </button>
        {signupMessage && (
          <p className={`signup-message signup-message-${signupStatus}`}>{signupMessage}</p>
        )}
      </div>
    </div>
  )
}
