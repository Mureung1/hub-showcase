import { useEffect, useMemo } from 'react'
import { Link, Navigate, useNavigate, useOutletContext } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { createRecommendation } from '../api/index.js'
import { buildDefaultPreferences } from '../utils/preferences.js'

// 4 · 이슈 검색 (에이전트) — 추천 API 응답을 기다렸다가 결과 화면으로 자동 전환
const SEARCH_STEPS = [
  {
    state: 'done',
    icon: '✓',
    title: '맞춤 이슈 검색',
    meta: '선택한 언어·난이도로 good first issue를 찾아요',
  },
  {
    state: 'done',
    icon: '✓',
    title: '활발한 레포만 남기기',
    meta: '방치된 레포는 걸러내고 유지보수가 활발한 곳만 추렸어요',
  },
  {
    state: 'active',
    icon: '3',
    title: '후보 이슈 살펴보는 중',
    meta: '유망한 이슈의 본문·필요 기술을 직접 확인하고 있어요',
  },
  {
    state: 'pending',
    icon: '4',
    title: '추천 이유 정리',
    meta: '왜 나에게 맞는지 한 줄로 정리해드려요',
  },
]

function IssueSearch() {
  const navigate = useNavigate()
  const { analysis, preferences, setRecommendation } = useOutletContext()
  // useMemo로 참조를 고정 — preferences가 null인 동안 매 렌더 새 객체가 생기면 아래 useEffect가 반복 실행된다
  const effectivePreferences = useMemo(
    () => preferences ?? (analysis ? buildDefaultPreferences(analysis) : null),
    [preferences, analysis],
  )

  const { mutate, error } = useMutation({
    mutationFn: () => createRecommendation(analysis.githubId, effectivePreferences),
  })

  useEffect(() => {
    if (!analysis || !effectivePreferences) return
    let cancelled = false
    // analysis/preferences가 바뀌어 이 effect가 다시 실행되기 전에 응답이 오면 무시 — 늦게 도착한
    // 이전 요청이 최신 상태를 덮어쓰고 엉뚱한 화면으로 넘기는 걸 막는다
    mutate(undefined, {
      onSuccess: (recommendation) => {
        if (cancelled) return
        setRecommendation(recommendation)
        navigate('/result')
      },
    })
    return () => {
      cancelled = true
    }
  }, [analysis, effectivePreferences, mutate, setRecommendation, navigate])

  if (!analysis) {
    return <Navigate to="/input" replace />
  }

  if (error) {
    return (
      <div className="panel">
        <h1 className="a-title">이슈를 찾지 못했어요</h1>
        <p className="a-lead">{error.message || '이슈를 찾지 못했어요. 잠시 후 다시 시도해주세요.'}</p>
        <Link to="/profile" className="btn btn-primary">
          다시 시도하기
        </Link>
      </div>
    )
  }

  return (
    <>
      <div className="panel">
        <h1 className="a-title">
          <span className="spinner" />
          이슈를 찾고 있어요
        </h1>
        <p className="a-lead">조건에 맞는 이슈를 검색하고, 스스로 다듬어가며 골라요.</p>
        <ul className="steps">
          {SEARCH_STEPS.map((step) => (
            <li key={step.title} className={`step-${step.state}`}>
              <div className="st-icon">{step.icon}</div>
              <div className="st-title">{step.title}</div>
              <div className="st-meta">{step.meta}</div>
            </li>
          ))}
        </ul>
      </div>
      <p className="foot-note">검색이 끝나면 자동으로 넘어가요</p>
    </>
  )
}

export default IssueSearch
