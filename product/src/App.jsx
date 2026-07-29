import { useCallback, useState } from 'react'
import SelectScreen from './screens/SelectScreen'
import StatsScreen from './screens/StatsScreen'
import ReverseScreen from './screens/ReverseScreen'
import ChecklistScreen from './screens/ChecklistScreen'
import RoadmapScreen from './screens/RoadmapScreen'
import { DEFAULT_JOB } from './data/jobs'
import { defaultScope } from './data/clusters'

// 화면 전환은 라우터 없이 useState로 관리한다.
// screen 상태가 바뀌면 그에 맞는 화면 컴포넌트가 렌더링된다.
function App() {
  const [screen, setScreen] = useState('select')

  // 선택한 직무. 다섯 화면이 전부 이 값을 job prop 으로 받는다.
  // 형태는 data/jobs.js 의 { job_role_id, display_name } 한 건과 같다.
  // job_role_id 는 API 요청에, display_name 은 화면 표시에 쓴다. 화면은 특정 직무 id 를 적지 않는다.
  const [job, setJob] = useState(DEFAULT_JOB)

  // 채용공고 해석·합격 전략·준비 로드맵이 공유하는 분석 범위.
  const [scope, setScope] = useState(defaultScope)
  // 체크 상태는 직무·기업군·공고 범위마다 분리한다.
  const [checksByScope, setChecksByScope] = useState({})
  const scopeKey = `${job.job_role_id}:${scope.level}:${scope.cluster_tag || ''}:${scope.posting_id || ''}`
  const checks = checksByScope[scopeKey] ?? null
  const setChecks = useCallback((next) => {
    setChecksByScope((prev) => {
      const current = prev[scopeKey] ?? null
      const value = typeof next === 'function' ? next(current) : next
      return { ...prev, [scopeKey]: value }
    })
  }, [scopeKey])

  const go = (next) => {
    setScreen(next)
    window.scrollTo(0, 0)
  }

  // 직무를 바꾸면 이전 직무의 공고 선택은 의미가 없으므로 범위를 기본값으로 되돌린다.
  // 체크 상태는 scopeKey 앞에 직무가 붙어 있어 직무별로 저절로 갈린다.
  const selectJob = useCallback((nextJob) => {
    if (nextJob.job_role_id === job.job_role_id) return
    setJob(nextJob)
    setScope(defaultScope())
  }, [job.job_role_id])

  const shared = { job, checks, setChecks, scope, setScope }

  switch (screen) {
    case 'stats':
      return <StatsScreen go={go} job={job} />
    case 'reverse':
      return <ReverseScreen go={go} job={job} scope={scope} setScope={setScope} />
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
