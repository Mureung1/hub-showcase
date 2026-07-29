import { useCallback, useEffect, useRef, useState } from 'react'
import SelectScreen from './screens/SelectScreen'
import StatsScreen from './screens/StatsScreen'
import ReverseScreen from './screens/ReverseScreen'
import ChecklistScreen from './screens/ChecklistScreen'
import RoadmapScreen from './screens/RoadmapScreen'
import { DEFAULT_JOB } from './data/jobs'
import { defaultScope } from './data/clusters'

// 화면 전환은 라우터 라이브러리 없이 useState 와 브라우저 히스토리 API 로 관리한다.
//
// 상태만으로 화면을 바꾸면 브라우저 히스토리에 아무것도 남지 않는다. 그런데 목차 링크는
// 히스토리를 쌓으므로, 다음 화면에서 뒤로가기를 누르면 화면이 아니라 이전 화면의 목차
// 위치로만 되돌아간다. 그래서 두 가지를 함께 지킨다.
//
//   - 화면 이동(`go`)은 `pushState` 로 히스토리에 항목을 남기고 `popstate` 로 되돌린다.
//   - 목차 링크는 `hooks/sectionJump.js` 가 `replaceState` 로 해시만 갈아 끼운다.
//
// 히스토리에 담는 상태는 화면 이름만이 아니라 직무와 범위까지다. 뒤로가기로 돌아갔을 때
// 직무·기업군·공고 선택이 그대로여야 하기 때문이다.
function App() {
  const [screen, setScreen] = useState('select')

  // 선택한 직무. 다섯 화면이 전부 이 값을 job prop 으로 받는다.
  // 형태는 data/jobs.js 의 { job_role_id, display_name } 한 건과 같다.
  // job_role_id 는 API 요청에, display_name 은 화면 표시에 쓴다. 화면은 특정 직무 id 를 적지 않는다.
  const [job, setJob] = useState(DEFAULT_JOB)

  // 채용공고 해석·합격 전략·준비 로드맵이 공유하는 분석 범위.
  // level 은 overall | cluster | posting | mine 이다. `mine` 은 서버 계약에 없는 화면 전용
  // 값으로, 아래 myPosting 의 payload 를 그대로 그린다는 뜻이다(요청으로 나가지 않는다).
  const [scope, setScope] = useState(defaultScope)

  // 사용자가 붙여넣어 분석한 공고 한 건.
  // { job_role_id, title, submittedAt, interpretation, strategy, roadmap }
  // 세 payload 는 POST /api/postings/analyze 응답 그대로이며 해석·전략·로드맵 화면이 쓰는
  // 형태와 같다. 그래서 화면을 옮길 때 다시 요청하지 않는다.
  const [myPosting, setMyPosting] = useState(null)

  // 체크 상태는 직무·기업군·공고 범위마다 분리한다.
  // 내가 입력한 공고는 기업군·공고 선택과 무관하므로 `mine` 키 하나로 따로 갈라 둔다.
  // 직무 전체 범위도 기업군과 무관하다. ScopeSwitch 가 되돌아올 자리를 기억하려고 cluster_tag 를
  // 남겨 두므로, 키에서는 그 값을 빼야 기업군을 거쳐 갈 때마다 체크가 갈리지 않는다.
  const [checksByScope, setChecksByScope] = useState({})
  const scopeKey = scope.level === 'mine'
    ? `${job.job_role_id}:mine:`
    : `${job.job_role_id}:${scope.level}:${scope.level === 'overall' ? '' : (scope.cluster_tag || '')}:${scope.posting_id || ''}`
  const checks = checksByScope[scopeKey] ?? null
  const setChecks = useCallback((next) => {
    setChecksByScope((prev) => {
      const current = prev[scopeKey] ?? null
      const value = typeof next === 'function' ? next(current) : next
      return { ...prev, [scopeKey]: value }
    })
  }, [scopeKey])

  // 지금 히스토리 항목에 현재 상태를 심는다.
  // 첫 진입도 이 자리에서 `replaceState` 로 시작 상태를 얻으므로, 뒤로가기가 상태 없는
  // 빈 항목으로 떨어지지 않는다. 화면 안에서 직무·범위가 바뀌어도 같은 항목을 갱신할 뿐
  // 새 항목을 쌓지 않는다(범위 전환은 화면 이동이 아니다).
  useEffect(() => {
    window.history.replaceState({ screen, job, scope }, '')
  }, [screen, job, scope])

  // 뒤로가기·앞으로가기. 히스토리에 담아 둔 화면·직무·범위를 그대로 되돌린다.
  const screenRef = useRef(screen)
  useEffect(() => { screenRef.current = screen }, [screen])
  useEffect(() => {
    const onPopState = (event) => {
      const state = event.state
      if (!state || !state.screen) return
      // 화면이 바뀌는 이동일 때만 맨 위로 올린다. 같은 화면이면 브라우저의 스크롤 복원을 둔다.
      if (state.screen !== screenRef.current) window.scrollTo(0, 0)
      setScreen(state.screen)
      if (state.job) setJob(state.job)
      if (state.scope) setScope(state.scope)
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  /**
   * 화면 이동. 두 번째 인자로 `{ scope }` 를 주면 그 범위로 열린다.
   *
   * 새 항목에 화면·직무·범위를 함께 담는다. 직무를 같은 조작에서 바꾼 경우(직무 선택 화면)
   * 여기서는 아직 이전 값이라, 위의 `replaceState` 효과가 상태 반영 직후 같은 항목을 채운다.
   * 주소에서 해시를 떼어 새 화면이 이전 화면의 목차 위치를 물려받지 않게 한다.
   */
  const go = useCallback((next, patch) => {
    const nextScope = patch && patch.scope ? patch.scope : scope
    if (patch && patch.scope) setScope(patch.scope)
    setScreen(next)
    // 같은 화면으로 되돌아오는 조작(상단바 로고 등)은 항목을 늘리지 않는다.
    // 뒤로가기 한 번에 같은 화면이 두 번 나오면 되돌아가지 않는 것처럼 보인다.
    if (next !== screenRef.current || (patch && patch.scope)) {
      window.history.pushState({ screen: next, job, scope: nextScope }, '', window.location.pathname + window.location.search)
    }
    window.scrollTo(0, 0)
  }, [job, scope])

  // 직무를 바꾸면 이전 직무의 공고 선택은 의미가 없으므로 범위를 기본값으로 되돌리고
  // 붙여넣은 공고 분석 결과도 비운다. 체크 상태는 scopeKey 앞에 직무가 붙어 저절로 갈린다.
  const selectJob = useCallback((nextJob) => {
    if (nextJob.job_role_id === job.job_role_id) return
    setJob(nextJob)
    setScope(defaultScope())
    setMyPosting(null)
  }, [job.job_role_id])

  const shared = { job, checks, setChecks, scope, setScope, myPosting }

  switch (screen) {
    case 'stats':
      return <StatsScreen go={go} job={job} />
    case 'reverse':
      return <ReverseScreen go={go} job={job} scope={scope} setScope={setScope} myPosting={myPosting} setMyPosting={setMyPosting} />
    case 'checklist':
      return <ChecklistScreen go={go} {...shared} />
    case 'roadmap':
      return <RoadmapScreen go={go} {...shared} />
    case 'select':
    default:
      return <SelectScreen go={go} job={job} setJob={selectJob} />
  }
}

export default App
