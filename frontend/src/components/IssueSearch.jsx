import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useOutletContext } from 'react-router-dom'
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

  const [error, setError] = useState(null)

  // 같은 조건으로 이미 요청을 보냈는지 추적 — StrictMode(개발 모드)가 effect를 두 번 실행하거나
  // 리렌더로 effect가 다시 돌아도 실제 요청이 중복 발사되지 않게 막는다(하루 재추천 상한을 검색 한 번에
  // 다 써버리는 버그로 발견, 2026-07-27). 이 ref로 "응답이 최신 요청에 대한 것인지"도 함께 판정한다.
  // useMutation의 mutate(vars, { onSuccess }) 콜백은 이 StrictMode 상황에서 응답이 와도 호출되지
  // 않는 현상이 Analyze.jsx에서 실측으로 확인돼(네트워크 탭 200, onSuccess/onError 둘 다 미발생),
  // 라이브러리 콜백에 기대지 않고 Promise를 직접 처리하는 방식으로 우회했다
  const requestedKeyRef = useRef(null)

  useEffect(() => {
    if (!analysis || !effectivePreferences) return
    const requestKey = JSON.stringify([analysis.githubId, effectivePreferences])
    if (requestedKeyRef.current === requestKey) return
    requestedKeyRef.current = requestKey

    createRecommendation(analysis.githubId, effectivePreferences)
      .then((recommendation) => {
        if (requestedKeyRef.current !== requestKey) return
        setRecommendation(recommendation)
        navigate('/result')
      })
      .catch((err) => {
        if (requestedKeyRef.current !== requestKey) return
        setError(err)
      })
  }, [analysis, effectivePreferences, setRecommendation, navigate])

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
