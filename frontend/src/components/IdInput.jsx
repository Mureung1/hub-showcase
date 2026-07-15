import { useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'

// 1 · GitHub 아이디 입력
function IdInput() {
  const navigate = useNavigate()
  const { githubId, setGithubId } = useOutletContext()
  const [value, setValue] = useState(githubId)
  const [error, setError] = useState('')

  function handleSubmit(event) {
    event.preventDefault()
    const trimmed = value.trim()
    if (!trimmed) {
      setError('GitHub 아이디를 입력해주세요')
      return
    }
    setGithubId(trimmed)
    navigate('/analyze')
  }

  return (
    <>
      <form className="panel" onSubmit={handleSubmit}>
        <div className="eyebrow">First-pr 시작하기</div>
        <h1 className="hero">
          먼저, 당신의
          <br />
          GitHub을 볼게요
        </h1>
        <p className="lead">
          공개 활동만 분석해서
          <br />
          지금 실력에 맞는 첫 기여 이슈를 찾아드릴게요.
        </p>
        <label className="label" htmlFor="gh-id">
          GitHub 아이디
        </label>
        <div className="gh-input">
          <span className="at">github.com/</span>
          <input
            id="gh-id"
            type="text"
            value={value}
            onChange={(event) => {
              setValue(event.target.value)
              setError('')
            }}
            placeholder="octocat"
            aria-label="GitHub 아이디"
          />
        </div>
        {error && <p className="field-error">{error}</p>}
        <button type="submit" className="btn btn-primary btn-block">
          내 활동 분석하기
        </button>
      </form>
      <p className="foot-note">로그인 없이 공개 활동만으로 분석해요</p>
    </>
  )
}

export default IdInput
