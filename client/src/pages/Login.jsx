import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext.jsx"

export default function Login() {
  const navigate = useNavigate()
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState("signin")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    const { error: authError } = mode === "signin" ? await signIn(email, password) : await signUp(email, password)

    setSubmitting(false)

    if (authError) {
      setError(authError.message)
      return
    }

    if (mode === "signup") {
      setError(null)
      setMode("signin")
      return
    }

    navigate("/")
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>{mode === "signin" ? "로그인" : "회원가입"}</h1>
        <p className="page-subtitle">단어장은 로그인한 사용자별로 저장됩니다.</p>
      </header>

      <form className="login-form" onSubmit={handleSubmit}>
        <label className="login-field">
          이메일
          <input
            className="login-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label className="login-field">
          비밀번호
          <input
            className="login-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
          />
        </label>

        {error && <p className="login-error">{error}</p>}

        <button className="login-submit" type="submit" disabled={submitting}>
          {mode === "signin" ? "로그인" : "회원가입"}
        </button>

        <button
          type="button"
          className="login-toggle"
          onClick={() => {
            setError(null)
            setMode(mode === "signin" ? "signup" : "signin")
          }}
        >
          {mode === "signin" ? "계정이 없나요? 회원가입" : "이미 계정이 있나요? 로그인"}
        </button>
      </form>
    </div>
  )
}
