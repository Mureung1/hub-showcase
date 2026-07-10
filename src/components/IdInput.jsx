import { Link } from 'react-router-dom'

// 1 · GitHub 아이디 입력
function IdInput() {
  return (
    <>
      <div className="panel">
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
          <input id="gh-id" type="text" defaultValue="sunho-kim" aria-label="GitHub 아이디" />
        </div>
        <Link to="/analyze" className="btn btn-primary btn-block">
          내 활동 분석하기
        </Link>
      </div>
      <p className="foot-note">로그인 없이 공개 활동만으로 분석해요</p>
    </>
  )
}

export default IdInput
