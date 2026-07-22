import { useEffect } from 'react'
import { Link, Navigate, useNavigate, useOutletContext } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
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

  const { mutate, error } = useMutation({
    // 최소 표시 시간: API가 빨라도 분석 단계를 읽을 시간을 확보 (API가 느리면 추가 지연 없음)
    mutationFn: () =>
      Promise.all([
        createAnalysis(githubId),
        new Promise((resolve) => setTimeout(resolve, MIN_DISPLAY_MS)),
      ]).then(([analysis]) => analysis),
  })

  useEffect(() => {
    if (!githubId) return
    let cancelled = false
    // githubId가 바뀌어 이 effect가 다시 실행되기 전에 응답이 오면 무시 — 늦게 도착한 이전 요청이
    // 최신 상태를 덮어쓰고 엉뚱한 화면으로 넘기는 걸 막는다
    mutate(undefined, {
      onSuccess: (analysis) => {
        if (cancelled) return
        setAnalysis(analysis)
        navigate('/profile')
      },
    })
    return () => {
      cancelled = true
    }
  }, [githubId, mutate, setAnalysis, navigate])

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
