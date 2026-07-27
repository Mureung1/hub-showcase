import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useOutletContext } from 'react-router-dom'
import { createAnalysis } from '../api/index.js'

// 2 · 프로필 분석 중 — 분석 API 응답을 기다렸다가 프로필 화면으로 자동 전환
const MIN_DISPLAY_MS = 2200

const ANALYZE_STEPS = [
  {
    state: 'done',
    icon: '✓',
    title: '공개 레포·커밋 수집',
    meta: '본인이 기여한 레포만 · 최근 12개월',
  },
  {
    state: 'active',
    icon: '2',
    title: '언어·활동 분석',
    meta: '빌드·자동생성 파일은 빼고, 실제 작성한 코드만 집계해요',
  },
  {
    state: 'pending',
    icon: '3',
    title: '실력·관심 영역 추정',
    meta: '기여 패턴으로 난이도와 관심 분야를 가늠해요',
  },
]

function Analyze() {
  const navigate = useNavigate()
  const { githubId, setAnalysis } = useOutletContext()
  const [error, setError] = useState(null)

  // 같은 githubId로 이미 요청을 보냈는지 추적 — StrictMode 이중 실행 등으로 effect가 다시 돌아도
  // 실제 요청이 중복 발사되지 않게 막는다. 이 ref로 "응답이 최신 요청에 대한 것인지"도 함께 판정한다
  // (로컬 클로저 변수(cancelled)를 쓰면 StrictMode의 synthetic cleanup이 유일하게 발사된 요청의
  // 클로저까지 취소 처리해버려 응답이 와도 무시되는 문제가 있었다).
  // useMutation의 mutate(vars, { onSuccess }) 콜백은 이 StrictMode 상황에서 응답이 와도 호출되지
  // 않는 현상이 실측으로 확인돼(네트워크 탭 200, 콘솔 로그로 onSuccess/onError 둘 다 미발생), 라이브러리
  // 콜백에 기대지 않고 Promise를 직접 처리하는 방식으로 우회했다(2026-07-27)
  const requestedGithubIdRef = useRef(null)

  useEffect(() => {
    if (!githubId) return
    if (requestedGithubIdRef.current === githubId) return
    requestedGithubIdRef.current = githubId

    // 최소 표시 시간: API가 빨라도 분석 단계를 읽을 시간을 확보 (API가 느리면 추가 지연 없음)
    Promise.all([
      createAnalysis(githubId),
      new Promise((resolve) => setTimeout(resolve, MIN_DISPLAY_MS)),
    ])
      .then(([analysis]) => {
        if (requestedGithubIdRef.current !== githubId) return
        setAnalysis(analysis)
        navigate('/profile')
      })
      .catch((err) => {
        if (requestedGithubIdRef.current !== githubId) return
        setError(err)
      })
  }, [githubId, setAnalysis, navigate])

  if (!githubId) {
    return <Navigate to="/input" replace />
  }

  if (error) {
    return (
      <div className="panel">
        <h1 className="a-title">분석하지 못했어요</h1>
        <p className="a-lead">{error.message || '분석에 실패했어요. 잠시 후 다시 시도해주세요.'}</p>
        <Link to="/input" className="btn btn-primary">
          다시 입력하기
        </Link>
      </div>
    )
  }

  return (
    <div className="panel">
      <h1 className="a-title">
        <span className="spinner" />
        활동을 살펴보고 있어요
      </h1>
      <p className="a-lead">@{githubId} 님의 공개 GitHub 활동을 분석 중이에요.</p>
      <ul className="steps">
        {ANALYZE_STEPS.map((step) => (
          <li key={step.title} className={`step-${step.state}`}>
            <div className="st-icon">{step.icon}</div>
            <div className="st-title">{step.title}</div>
            <div className="st-meta">{step.meta}</div>
          </li>
        ))}
      </ul>
      <p className="foot-note">분석이 끝나면 자동으로 넘어가요</p>
    </div>
  )
}

export default Analyze
