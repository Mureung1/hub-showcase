import { AI_RUN_STATUS, TASK_STATUS } from '@teamflow/shared'
import Bot from 'lucide-react/dist/esm/icons/bot.mjs'
import Check from 'lucide-react/dist/esm/icons/check.mjs'
import ClipboardList from 'lucide-react/dist/esm/icons/clipboard-list.mjs'
import FileCheck from 'lucide-react/dist/esm/icons/file-check.mjs'
import Play from 'lucide-react/dist/esm/icons/play.mjs'
import Plus from 'lucide-react/dist/esm/icons/plus.mjs'
import Save from 'lucide-react/dist/esm/icons/save.mjs'
import Sparkles from 'lucide-react/dist/esm/icons/sparkles.mjs'
import XCircle from 'lucide-react/dist/esm/icons/x-circle.mjs'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'

import { Avatar } from '../../components/ui/Avatar.jsx'
import { TASK_STATUS_LABEL } from '../../constants/labels.js'
import { formatShortDate } from '../../lib/format.js'
import {
  selectProjectAiAgent,
  selectProjectAiMember,
  selectProjectAiRuns,
  selectProjectTasks,
} from '../../state/selectors.js'
import { useTeamFlow } from '../../state/useTeamFlow.js'
import workspace from '../../styles/workspace.module.css'
import { MarkdownPreview } from '../notes/MarkdownPreview.jsx'
import styles from './AiPage.module.css'

const DEFAULT_CONTEXT = Object.freeze({
  project: true,
  notes: true,
  tasks: true,
  team: false,
  resources: true,
})

const contextOptions = [
  ['project', '프로젝트 설명', '프로젝트 이름과 설명'],
  ['notes', '공유 노트', '팀원이 작성한 노트 내용'],
  ['tasks', '할 일 목록', '프로젝트의 업무와 마감일'],
  ['team', '팀원 역할', '사람과 AI 팀원의 역할'],
  ['resources', '자료실 이름과 설명', '등록된 자료의 메타데이터'],
]

const runStatusLabel = {
  [AI_RUN_STATUS.RUNNING]: '작업 중',
  [AI_RUN_STATUS.PENDING_REVIEW]: '검토 대기',
  [AI_RUN_STATUS.APPLIED]: '반영 완료',
  [AI_RUN_STATUS.REJECTED]: '보류',
  [AI_RUN_STATUS.FAILED]: '실패',
}

export function AiPage() {
  const { project } = useOutletContext()
  const { state, actions, capabilities, readOnly } = useTeamFlow()
  const { reloadOnEntry } = actions
  const aiMember = useMemo(
    () => selectProjectAiMember(state, project.id),
    [state, project.id],
  )
  const aiAgent = useMemo(
    () => selectProjectAiAgent(state, project.id),
    [state, project.id],
  )
  const aiRuns = useMemo(
    () => selectProjectAiRuns(state, project.id),
    [state, project.id],
  )
  const projectTasks = useMemo(
    () => selectProjectTasks(state, project.id),
    [state, project.id],
  )
  const aiTasks = useMemo(
    () => aiMember
      ? projectTasks.filter((task) => task.assigneeId === aiMember.id)
      : [],
    [projectTasks, aiMember],
  )
  const taskById = useMemo(
    () => new Map(projectTasks.map((task) => [task.id, task])),
    [projectTasks],
  )
  const openRunByTaskId = useMemo(
    () => new Map(aiRuns
      .filter((run) => (
        run.taskId
        && [AI_RUN_STATUS.RUNNING, AI_RUN_STATUS.PENDING_REVIEW].includes(run.status)
      ))
      .map((run) => [run.taskId, run])),
    [aiRuns],
  )
  const canWrite = !readOnly && capabilities.ai
  const [instructions, setInstructions] = useState(() => aiAgent?.instructions ?? '')
  const [contextConfig, setContextConfig] = useState(() => ({
    ...DEFAULT_CONTEXT,
    ...(aiAgent?.contextConfig ?? {}),
  }))
  const [selectedRunId, setSelectedRunId] = useState('')
  const [adding, setAdding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [runningTaskId, setRunningTaskId] = useState('')
  const [reviewingRunId, setReviewingRunId] = useState('')
  const [feedback, setFeedback] = useState('')
  const [error, setError] = useState('')
  const feedbackTimer = useRef(null)
  const settingsDirty = useRef(false)
  const settingsMemberId = useRef(aiAgent?.memberId ?? '')

  useEffect(() => {
    if (!readOnly) void reloadOnEntry().catch(() => {})
  }, [project.id, readOnly, reloadOnEntry])

  useEffect(() => {
    const memberId = aiAgent?.memberId ?? ''
    if (settingsDirty.current && settingsMemberId.current === memberId) return
    settingsMemberId.current = memberId
    settingsDirty.current = false
    setInstructions(aiAgent?.instructions ?? '')
    setContextConfig({ ...DEFAULT_CONTEXT, ...(aiAgent?.contextConfig ?? {}) })
  }, [aiAgent])

  useEffect(() => {
    if (aiRuns.length === 0) {
      setSelectedRunId('')
      return
    }
    if (!aiRuns.some((run) => run.id === selectedRunId)) {
      setSelectedRunId(aiRuns[0].id)
    }
  }, [aiRuns, selectedRunId])

  useEffect(() => () => clearTimeout(feedbackTimer.current), [])

  const selectedRun = aiRuns.find((run) => run.id === selectedRunId) ?? null
  const selectedTask = selectedRun?.taskId ? taskById.get(selectedRun.taskId) : null

  function showFeedback(message) {
    clearTimeout(feedbackTimer.current)
    setFeedback(message)
    feedbackTimer.current = setTimeout(() => setFeedback(''), 3000)
  }

  async function addAiAgent() {
    setAdding(true)
    setError('')
    try {
      await actions.createAiAgent(project.id)
      showFeedback('자료조사 AI를 프로젝트에 추가했습니다.')
    } catch (requestError) {
      setError(errorMessage(requestError, 'AI 팀원을 추가하지 못했습니다.'))
    } finally {
      setAdding(false)
    }
  }

  async function saveSettings() {
    if (!aiMember) return
    setSaving(true)
    setError('')
    try {
      await actions.updateAiAgent(aiMember.id, { instructions, contextConfig })
      settingsDirty.current = false
      showFeedback('AI 역할과 참고 컨텍스트를 저장했습니다.')
    } catch (requestError) {
      setError(errorMessage(requestError, 'AI 설정을 저장하지 못했습니다.'))
    } finally {
      setSaving(false)
    }
  }

  async function runTask(taskId) {
    if (!aiMember) return
    setRunningTaskId(taskId)
    setError('')
    try {
      const aiRun = await actions.createAiRun(aiMember.id, taskId)
      setSelectedRunId(aiRun.id)
      showFeedback(aiRun.status === AI_RUN_STATUS.FAILED
        ? '모의 작업 실행에 실패했습니다. 실행 이력을 확인해 주세요.'
        : '모의 작업 결과가 준비되었습니다. 검토 후 반영해 주세요.')
    } catch (requestError) {
      setError(errorMessage(requestError, '모의 작업을 실행하지 못했습니다.'))
    } finally {
      setRunningTaskId('')
    }
  }

  async function reviewRun(action) {
    if (!selectedRun) return
    setReviewingRunId(selectedRun.id)
    setError('')
    try {
      if (action === 'apply') {
        const result = await actions.applyAiRun(selectedRun.id)
        setSelectedRunId(result.aiRun.id)
        showFeedback('AI 결과를 공유 노트에 반영했습니다.')
      } else {
        const aiRun = await actions.rejectAiRun(selectedRun.id)
        setSelectedRunId(aiRun.id)
        showFeedback('AI 결과를 보류했습니다.')
      }
    } catch (requestError) {
      setError(errorMessage(requestError, 'AI 결과를 검토하지 못했습니다.'))
    } finally {
      setReviewingRunId('')
    }
  }

  return (
    <section className={workspace.scrollPage} aria-labelledby="ai-title">
      <div className={workspace.container}>
        <header className={workspace.pageHeader}>
          <div>
            <p>{project.name} · AI 팀원</p>
            <h1 id="ai-title">AI 팀원 관리</h1>
          </div>
        </header>

        <div className={styles.mockNotice}>
          <Sparkles size={16} aria-hidden="true" />
          <p><strong>Mock 모드</strong><span>외부 AI API를 호출하지 않고 TeamFlow 서버가 고정된 규칙으로 결과를 만듭니다.</span></p>
        </div>

        {error ? <p className={styles.pageError} role="alert">{error}</p> : null}

        {!aiMember || !aiAgent ? (
          <article className={`${workspace.card} ${styles.emptyAgent}`}>
            <span className={styles.emptyIcon}><Bot size={24} aria-hidden="true" /></span>
            <div>
              <h2>이 프로젝트에는 아직 AI 팀원이 없습니다.</h2>
              <p>자료조사 AI 한 명을 추가해 역할을 정하고, 기존 할 일을 배정해 모의 결과를 만들어 보세요.</p>
            </div>
            {canWrite ? (
              <button type="button" className={workspace.primaryButton} onClick={addAiAgent} disabled={adding}>
                <Plus size={15} aria-hidden="true" />{adding ? '추가 중...' : '자료조사 AI 추가'}
              </button>
            ) : null}
          </article>
        ) : (
          <>
            <div className={styles.aiIdentity}>
              <Avatar member={aiMember} size="large" />
              <div>
                <div><h2>{aiMember.name}</h2><em>AI 팀원</em></div>
                <p>{aiMember.role} · 프로젝트에 배정된 할 일을 Mock 방식으로 수행합니다.</p>
              </div>
            </div>

            <div className={styles.layout}>
              <div className={styles.leftColumn}>
                <article className={`${workspace.card} ${styles.settingsCard}`}>
                  <header>
                    <div><Sparkles size={16} aria-hidden="true" /><h2>역할 지시사항</h2></div>
                  </header>
                  <textarea
                    disabled={!canWrite || saving}
                    value={instructions}
                    onChange={(event) => {
                      settingsDirty.current = true
                      setInstructions(event.target.value)
                    }}
                    aria-label="AI 역할 지시사항"
                    maxLength={10_000}
                    placeholder="AI 팀원이 따라야 할 역할과 작업 원칙을 입력하세요"
                  />
                </article>

                <article className={`${workspace.card} ${styles.contextCard}`}>
                  <header>
                    <h2>참고할 컨텍스트</h2>
                    <p>실행 결과에 포함할 프로젝트 정보를 선택하세요.</p>
                  </header>
                  <div>
                    {contextOptions.map(([key, label, description]) => (
                      <label key={key}>
                        <span><strong>{label}</strong><small>{description}</small></span>
                        <input
                          disabled={!canWrite || saving}
                          type="checkbox"
                          checked={Boolean(contextConfig[key])}
                          onChange={() => {
                            settingsDirty.current = true
                            setContextConfig((current) => ({
                              ...current,
                              [key]: !current[key],
                            }))
                          }}
                        />
                        <i aria-hidden="true" />
                      </label>
                    ))}
                  </div>
                  {canWrite ? (
                    <footer>
                      <button type="button" onClick={saveSettings} disabled={saving}>
                        <Save size={14} aria-hidden="true" />{saving ? '저장 중...' : '설정 저장'}
                      </button>
                    </footer>
                  ) : null}
                </article>
              </div>

              <div className={styles.rightColumn}>
                <article className={`${workspace.card} ${styles.tasksCard}`}>
                  <header className={workspace.sectionHeader}>
                    <div><ClipboardList size={16} aria-hidden="true" /><h2>AI 담당 할 일</h2></div>
                    <span><b className={workspace.mono}>{aiTasks.length}</b>개</span>
                  </header>
                  {aiTasks.length === 0 ? (
                    <p className={workspace.empty}>할 일 생성·수정 화면에서 자료조사 AI를 담당자로 지정해 주세요.</p>
                  ) : (
                    <ul className={styles.taskList}>
                      {aiTasks.map((task) => {
                        const openRun = openRunByTaskId.get(task.id)
                        const isRunning = runningTaskId === task.id
                        const completed = task.status === TASK_STATUS.COMPLETED
                        return (
                          <li key={task.id}>
                            <div>
                              <strong>{task.title}</strong>
                              <span>{TASK_STATUS_LABEL[task.status]} · 마감 <b className={workspace.mono}>{formatShortDate(task.dueDate)}</b></span>
                            </div>
                            {canWrite ? (
                              <button
                                type="button"
                                onClick={() => runTask(task.id)}
                                disabled={completed || isRunning || Boolean(openRun)}
                                title={completed ? '완료된 할 일은 실행할 수 없습니다.' : undefined}
                              >
                                <Play size={13} aria-hidden="true" />
                                {isRunning ? '작업 중' : openRun ? '검토 대기' : completed ? '실행 완료' : '모의 작업 실행'}
                              </button>
                            ) : null}
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </article>

                <article className={`${workspace.card} ${styles.resultCard}`}>
                  <header className={workspace.sectionHeader}>
                    <h2>실행 결과</h2>
                    {selectedRun ? <RunStatus status={selectedRun.status} /> : null}
                  </header>
                  {selectedRun ? (
                    <>
                      <div className={styles.resultMeta}>
                        <strong>{selectedTask?.title ?? selectedRun.contextSnapshot?.task?.title ?? '삭제된 할 일'}</strong>
                        <span className={workspace.mono}>{formatShortDate(selectedRun.createdAt)}</span>
                      </div>
                      <div className={styles.markdownResult}>
                        {selectedRun.resultMarkdown
                          ? <MarkdownPreview content={selectedRun.resultMarkdown} />
                          : <p>{selectedRun.errorMessage || '결과 내용이 없습니다.'}</p>}
                      </div>
                      {selectedRun.status === AI_RUN_STATUS.PENDING_REVIEW && canWrite ? (
                        <div className={styles.reviewActions}>
                          <button
                            type="button"
                            className={styles.rejectButton}
                            onClick={() => reviewRun('reject')}
                            disabled={reviewingRunId === selectedRun.id}
                          >
                            <XCircle size={14} aria-hidden="true" />보류
                          </button>
                          <button
                            type="button"
                            className={styles.applyButton}
                            onClick={() => reviewRun('apply')}
                            disabled={reviewingRunId === selectedRun.id}
                          >
                            <FileCheck size={14} aria-hidden="true" />
                            {reviewingRunId === selectedRun.id ? '처리 중...' : '공유 노트로 반영'}
                          </button>
                        </div>
                      ) : null}
                      {selectedRun.status === AI_RUN_STATUS.APPLIED && selectedRun.appliedNoteId ? (
                        <Link className={styles.noteLink} to={`../notes?note=${selectedRun.appliedNoteId}`}>
                          <Check size={14} aria-hidden="true" />반영된 공유 노트 보기
                        </Link>
                      ) : null}
                    </>
                  ) : (
                    <p className={workspace.empty}>AI 담당 할 일을 실행하면 검토할 결과가 여기에 표시됩니다.</p>
                  )}
                </article>
              </div>
            </div>

            <article className={`${workspace.card} ${styles.historyCard}`}>
              <header className={workspace.sectionHeader}>
                <h2>실행 이력</h2>
                <span><b className={workspace.mono}>{aiRuns.length}</b>건</span>
              </header>
              {aiRuns.length === 0 ? (
                <p className={workspace.empty}>아직 실행 이력이 없습니다.</p>
              ) : (
                <div className={styles.historyList}>
                  {aiRuns.map((run) => {
                    const task = run.taskId ? taskById.get(run.taskId) : null
                    return (
                      <button
                        type="button"
                        key={run.id}
                        aria-pressed={run.id === selectedRunId}
                        onClick={() => setSelectedRunId(run.id)}
                      >
                        <span>
                          <strong>{task?.title ?? run.contextSnapshot?.task?.title ?? '삭제된 할 일'}</strong>
                          <small className={workspace.mono}>{formatShortDate(run.createdAt)}</small>
                        </span>
                        <RunStatus status={run.status} />
                      </button>
                    )
                  })}
                </div>
              )}
            </article>
          </>
        )}

        <div className={styles.liveFeedback} aria-live="polite">{feedback}</div>
      </div>
    </section>
  )
}

function RunStatus({ status }) {
  return (
    <span className={`${styles.historyBadge} ${styles[`history_${status}`]}`}>
      {status === AI_RUN_STATUS.APPLIED ? <Check size={11} aria-hidden="true" /> : null}
      {runStatusLabel[status] ?? status}
    </span>
  )
}

function errorMessage(error, fallback) {
  return error instanceof Error ? error.message : fallback
}
