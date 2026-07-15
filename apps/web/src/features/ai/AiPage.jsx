import { TASK_STATUS } from '@teamflow/shared'
import Bot from 'lucide-react/dist/esm/icons/bot.mjs'
import Check from 'lucide-react/dist/esm/icons/check.mjs'
import ClipboardList from 'lucide-react/dist/esm/icons/clipboard-list.mjs'
import Send from 'lucide-react/dist/esm/icons/send.mjs'
import Sparkles from 'lucide-react/dist/esm/icons/sparkles.mjs'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useOutletContext } from 'react-router-dom'

import { aiHistory } from '../../data/mockData.js'
import { formatShortDate } from '../../lib/format.js'
import { useTeamFlow } from '../../state/useTeamFlow.js'
import workspace from '../../styles/workspace.module.css'
import styles from './AiPage.module.css'

const contextOptions = [
  ['project', '프로젝트 정보', '프로젝트 이름, 설명과 기간'],
  ['notes', '공유 노트', '팀원이 작성한 노트 내용'],
  ['resources', '자료실', '등록된 자료의 이름과 설명'],
  ['tasks', '할 일', '진행 중인 업무와 마감일'],
  ['team', '팀원 정보', '팀원의 역할과 담당 업무'],
]

const historyStatus = {
  applied: '반영 완료',
  pending_review: '검토 대기',
  rejected: '보류',
}

function dueDateAfterAWeek() {
  const date = new Date()
  date.setDate(date.getDate() + 7)
  return date.toISOString().slice(0, 10)
}

export function AiPage() {
  const { project } = useOutletContext()
  const { state, actions } = useTeamFlow()
  const settings = state.aiSettings[project.id] ?? { instructions: '', context: { project: true, notes: true, resources: true, tasks: true, team: false } }
  const [instructions, setInstructions] = useState(settings.instructions ?? '')
  const [brief, setBrief] = useState({ title: '', description: '' })
  const [feedback, setFeedback] = useState('')
  const [error, setError] = useState('')
  const feedbackTimer = useRef(null)

  useEffect(() => () => clearTimeout(feedbackTimer.current), [])

  const aiTasks = useMemo(() => state.tasks.filter((task) => task.projectId === project.id && task.assigneeId === state.aiMemberId), [state.tasks, state.aiMemberId, project.id])
  const completed = aiTasks.filter((task) => task.status === TASK_STATUS.COMPLETED).length
  const active = aiTasks.filter((task) => task.status === TASK_STATUS.IN_PROGRESS || task.status === TASK_STATUS.IN_REVIEW).length

  function showFeedback(message) {
    clearTimeout(feedbackTimer.current)
    setFeedback(message)
    feedbackTimer.current = setTimeout(() => setFeedback(''), 3000)
  }

  async function saveInstructions() {
    await actions.updateAiSettings(project.id, { instructions })
    showFeedback('역할 지시사항을 저장했습니다.')
  }

  async function toggleContext(key) {
    await actions.updateAiSettings(project.id, { context: { ...settings.context, [key]: !settings.context?.[key] } })
  }

  async function submitBrief(event) {
    event.preventDefault()
    if (!brief.title.trim()) {
      setError('AI에게 맡길 작업 제목을 입력해 주세요.')
      return
    }
    await actions.createTask(project.id, {
      title: brief.title.trim(),
      description: brief.description.trim() || 'AI 작업 브리핑에서 생성된 할 일입니다.',
      assigneeId: state.aiMemberId,
      dueDate: dueDateAfterAWeek(),
      status: TASK_STATUS.NOT_STARTED,
    })
    setBrief({ title: '', description: '' })
    setError('')
    showFeedback('AI 담당 할 일을 생성했습니다. 대시보드와 할 일 목록에 반영됩니다.')
  }

  return (
    <section className={workspace.scrollPage} aria-labelledby="ai-title">
      <div className={workspace.container}>
        <header className={workspace.pageHeader}><div><p>{project.name} · AI 팀원</p><h1 id="ai-title">AI 팀원 관리</h1></div></header>

        <div className={styles.aiIdentity}>
          <span><Bot size={22} /></span>
          <div><div><h2>자료조사 AI</h2><em>AI 팀원</em></div><p>프로젝트 컨텍스트를 바탕으로 자료 조사와 정리 업무를 지원합니다.</p></div>
        </div>

        <div className={styles.layout}>
          <div className={styles.leftColumn}>
            <article className={`${workspace.card} ${styles.settingsCard}`}>
              <header><div><Sparkles size={16} /><h2>역할 지시사항</h2></div><button type="button" onClick={saveInstructions}>저장</button></header>
              <textarea value={instructions} onChange={(event) => setInstructions(event.target.value)} aria-label="AI 역할 지시사항" placeholder="AI 팀원이 따라야 할 역할과 작업 원칙을 입력하세요" />
            </article>

            <article className={`${workspace.card} ${styles.contextCard}`}>
              <header><h2>참고할 컨텍스트</h2><p>AI가 작업할 때 참고할 프로젝트 정보를 선택하세요.</p></header>
              <div>{contextOptions.map(([key, label, description]) => <label key={key}><span><strong>{label}</strong><small>{description}</small></span><input type="checkbox" checked={Boolean(settings.context?.[key])} onChange={() => toggleContext(key)} /><i aria-hidden="true" /></label>)}</div>
            </article>
          </div>

          <div className={styles.rightColumn}>
            <article className={`${workspace.card} ${styles.briefCard}`}>
              <header><div><ClipboardList size={16} /><h2>새 작업 브리핑</h2></div><p>브리핑을 제출하면 AI 담당 할 일이 생성됩니다.</p></header>
              <form onSubmit={submitBrief}>
                <label><span>작업 제목 <em>*</em></span><input value={brief.title} onChange={(event) => { setBrief((current) => ({ ...current, title: event.target.value })); setError('') }} placeholder="예: 경쟁 서비스 기능 비교" /></label>
                <label><span>요청 내용 <small>(선택)</small></span><textarea value={brief.description} onChange={(event) => setBrief((current) => ({ ...current, description: event.target.value }))} placeholder="조사 범위, 결과물 형식 등 필요한 내용을 입력하세요" /></label>
                {error ? <p className={styles.error}>{error}</p> : null}
                <button type="submit" disabled={!brief.title.trim()}><Send size={14} />브리핑 제출</button>
              </form>
            </article>

            <div className={styles.stats}>
              <article><span>AI 담당 할 일</span><strong>{aiTasks.length}</strong></article>
              <article><span>진행·검토 중</span><strong>{active}</strong></article>
              <article><span>완료</span><strong>{completed}</strong></article>
            </div>
          </div>
        </div>

        <article className={`${workspace.card} ${styles.historyCard}`}>
          <header className={workspace.sectionHeader}><h2>작업 이력</h2><span>정적 예시 {aiHistory.length}건</span></header>
          <table className={workspace.table}>
            <thead><tr><th>작업</th><th>결과</th><th>날짜</th><th>상태</th></tr></thead>
            <tbody>{aiHistory.map((item) => <tr key={item.id}><td><p className={workspace.cellTitle}>{item.title}</p></td><td><p className={workspace.cellDescription}>{item.result}</p></td><td className={workspace.mono}>{formatShortDate(item.date)}</td><td><span className={`${styles.historyBadge} ${styles[`history_${item.status}`]}`}>{item.status === 'applied' ? <Check size={11} /> : null}{historyStatus[item.status]}</span></td></tr>)}</tbody>
          </table>
        </article>
        <div className={styles.liveFeedback} aria-live="polite">{feedback}</div>
      </div>
    </section>
  )
}
