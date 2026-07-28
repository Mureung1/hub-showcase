import { AI_RUN_STATUS, TASK_STATUS } from '@teamflow/shared'
import Bot from 'lucide-react/dist/esm/icons/bot.mjs'
import Check from 'lucide-react/dist/esm/icons/check.mjs'
import ClipboardList from 'lucide-react/dist/esm/icons/clipboard-list.mjs'
import FileCheck from 'lucide-react/dist/esm/icons/file-check.mjs'
import PauseCircle from 'lucide-react/dist/esm/icons/pause-circle.mjs'
import Play from 'lucide-react/dist/esm/icons/play.mjs'
import Plus from 'lucide-react/dist/esm/icons/plus.mjs'
import Save from 'lucide-react/dist/esm/icons/save.mjs'
import Sparkles from 'lucide-react/dist/esm/icons/sparkles.mjs'
import XCircle from 'lucide-react/dist/esm/icons/x-circle.mjs'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useOutletContext, useSearchParams } from 'react-router-dom'

import { Avatar } from '../../components/ui/Avatar.jsx'
import forms from '../../components/ui/forms.module.css'
import { TASK_STATUS_LABEL } from '../../constants/labels.js'
import { formatShortDate } from '../../lib/format.js'
import {
  selectProjectAiAgents,
  selectProjectAiMembers,
  selectProjectAiRuns,
  selectProjectTasks,
} from '../../state/selectors.js'
import { useTeamFlow } from '../../state/useTeamFlow.js'
import workspace from '../../styles/workspace.module.css'
import { MarkdownPreview } from '../notes/MarkdownPreview.jsx'
import { AiCredentialSettingsModal } from '../settings/AiCredentialSettingsModal.jsx'
import { AiExecutionStatus } from './AiExecutionStatus.jsx'
import { isAiRunBlocking, isAiRunStale } from './aiRunBlocking.js'
import { CreateAiAgentModal } from './CreateAiAgentModal.jsx'
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
  ['team', '팀원 역할', '사람과 AI Agent의 역할'],
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
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedMemberId = searchParams.get('agent') ?? ''
  const aiAgents = useMemo(
    () => selectProjectAiAgents(state, project.id),
    [state, project.id],
  )
  const aiMembers = useMemo(
    () => selectProjectAiMembers(state, project.id),
    [state, project.id],
  )
  const memberById = useMemo(
    () => new Map(aiMembers.map((member) => [member.id, member])),
    [aiMembers],
  )
  const selectedAiAgent = aiAgents.find((agent) => agent.memberId === requestedMemberId)
    ?? aiAgents[0]
    ?? null
  const selectedMemberId = selectedAiAgent?.memberId ?? ''
  const selectedAiMember = selectedMemberId ? memberById.get(selectedMemberId) ?? null : null
  const aiRuns = useMemo(
    () => selectProjectAiRuns(state, project.id, selectedMemberId),
    [state, project.id, selectedMemberId],
  )
  const projectTasks = useMemo(
    () => selectProjectTasks(state, project.id),
    [state, project.id],
  )
  const aiTasks = useMemo(
    () => projectTasks.filter((task) => task.assigneeId === selectedMemberId),
    [projectTasks, selectedMemberId],
  )
  const taskById = useMemo(
    () => new Map(projectTasks.map((task) => [task.id, task])),
    [projectTasks],
  )
  const blockingRunByTaskId = useMemo(
    () => new Map(aiRuns
      .filter((run) => (
        run.taskId
        && isAiRunBlocking(run)
      ))
      .map((run) => [run.taskId, run])),
    [aiRuns],
  )
  const canWrite = !readOnly && capabilities.ai
  const liveExecution = state.aiExecution.mode === 'live'
  const credentialConnected = Boolean(
    state.aiCredential.configured
    && state.aiCredential.verifiedAt
  )
  const executionReady = !liveExecution || credentialConnected
  const [profile, setProfile] = useState(() => profileValues(selectedAiMember))
  const [instructions, setInstructions] = useState(() => selectedAiAgent?.instructions ?? '')
  const [contextConfig, setContextConfig] = useState(() => ({
    ...DEFAULT_CONTEXT,
    ...(selectedAiAgent?.contextConfig ?? {}),
  }))
  const [selectedRunId, setSelectedRunId] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [showCredentialSettings, setShowCredentialSettings] = useState(false)
  const [saving, setSaving] = useState(false)
  const [changingEnabled, setChangingEnabled] = useState(false)
  const [runningRequest, setRunningRequest] = useState(null)
  const [reviewingRunId, setReviewingRunId] = useState('')
  const [feedback, setFeedback] = useState('')
  const [error, setError] = useState('')
  const feedbackTimer = useRef(null)
  const settingsDirty = useRef(false)
  const settingsMemberId = useRef(selectedMemberId)

  useEffect(() => {
    if (!readOnly) void reloadOnEntry().catch(() => {})
  }, [project.id, readOnly, reloadOnEntry])

  useEffect(() => {
    if (aiAgents.length === 0) {
      if (requestedMemberId) setSearchParams({}, { replace: true })
      return
    }
    if (!aiAgents.some((agent) => agent.memberId === requestedMemberId)) {
      setSearchParams({ agent: aiAgents[0].memberId }, { replace: true })
    }
  }, [aiAgents, requestedMemberId, setSearchParams])

  useEffect(() => {
    if (settingsDirty.current && settingsMemberId.current === selectedMemberId) return
    settingsMemberId.current = selectedMemberId
    settingsDirty.current = false
    setProfile(profileValues(selectedAiMember))
    setInstructions(selectedAiAgent?.instructions ?? '')
    setContextConfig({ ...DEFAULT_CONTEXT, ...(selectedAiAgent?.contextConfig ?? {}) })
  }, [selectedAiMember, selectedAiAgent, selectedMemberId])

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
  const localRunningTask = runningRequest?.memberId === selectedMemberId
    ? taskById.get(runningRequest.taskId) ?? null
    : null
  const selectedRunStale = isAiRunStale(selectedRun)
  const persistedRunningTask = (
    selectedRun?.status === AI_RUN_STATUS.RUNNING
    && !selectedRunStale
  )
    ? selectedTask ?? { title: selectedRun.contextSnapshot?.task?.title ?? 'AI 작업' }
    : null
  const runningTask = localRunningTask ?? persistedRunningTask
  const selectedAgentTrace = displayAgentTrace(selectedRun?.agentTrace)
  const agentEnabled = Boolean(selectedAiAgent?.enabled)

  function showFeedback(message) {
    clearTimeout(feedbackTimer.current)
    setFeedback(message)
    feedbackTimer.current = setTimeout(() => setFeedback(''), 3000)
  }

  function selectAgent(memberId) {
    if (runningRequest) return
    settingsDirty.current = false
    setError('')
    setSelectedRunId('')
    setSearchParams({ agent: memberId })
  }

  async function saveSettings() {
    if (!selectedAiMember || !selectedAiAgent) return
    if (!profile.name.trim() || !profile.role.trim()) {
      setError('AI Agent 이름과 역할을 입력해 주세요.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await actions.updateAiAgent(selectedAiMember.id, {
        name: profile.name.trim(),
        role: profile.role.trim(),
        description: profile.description.trim(),
        instructions,
        contextConfig,
      })
      settingsDirty.current = false
      showFeedback('AI Agent 설정을 저장했습니다.')
    } catch (requestError) {
      setError(errorMessage(requestError, 'AI Agent 설정을 저장하지 못했습니다.'))
    } finally {
      setSaving(false)
    }
  }

  async function changeEnabled() {
    if (!selectedAiMember || !selectedAiAgent) return
    setChangingEnabled(true)
    setError('')
    try {
      await actions.updateAiAgent(selectedAiMember.id, { enabled: !selectedAiAgent.enabled })
      showFeedback(selectedAiAgent.enabled ? 'AI Agent를 비활성화했습니다.' : 'AI Agent를 활성화했습니다.')
    } catch (requestError) {
      setError(errorMessage(requestError, 'AI Agent 상태를 변경하지 못했습니다.'))
    } finally {
      setChangingEnabled(false)
    }
  }

  async function runTask(taskId) {
    if (!selectedAiMember || !agentEnabled || !executionReady || runningRequest) return
    const request = { memberId: selectedAiMember.id, taskId }
    setRunningRequest(request)
    setError('')
    try {
      const aiRun = await actions.createAiRun(selectedAiMember.id, taskId)
      setSelectedRunId(aiRun.id)
      showFeedback(aiRun.status === AI_RUN_STATUS.FAILED
        ? `${liveExecution ? 'AI' : '모의'} 작업 실행에 실패했습니다. 실행 이력을 확인해 주세요.`
        : `${liveExecution ? 'AI' : '모의'} 작업 결과가 준비되었습니다. 검토 후 반영해 주세요.`)
    } catch (requestError) {
      if (requestError?.aiRun?.id) {
        setSelectedRunId(requestError.aiRun.id)
      }
      if (['AI_CREDENTIAL_REQUIRED', 'AI_CREDENTIAL_INVALID'].includes(requestError?.code)) {
        try {
          await actions.refreshAiCredential()
        } catch {
          // The original execution error is more useful than a metadata refresh failure.
        }
        setShowCredentialSettings(true)
      }
      setError(errorMessage(requestError, `${liveExecution ? 'AI' : '모의'} 작업을 실행하지 못했습니다.`))
    } finally {
      setRunningRequest((current) => (current === request ? null : current))
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

  function updateProfile(key, value) {
    settingsDirty.current = true
    setProfile((current) => ({ ...current, [key]: value }))
  }

  function updateInstructions(value) {
    settingsDirty.current = true
    setInstructions(value)
  }

  function toggleContext(key) {
    settingsDirty.current = true
    setContextConfig((current) => ({ ...current, [key]: !current[key] }))
  }

  return (
    <section className={workspace.scrollPage} aria-labelledby="ai-title">
      <div className={workspace.container}>
        <header className={workspace.pageHeader}>
          <div>
            <p>{project.name} · AI Agent</p>
            <h1 id="ai-title">AI Agent 관리</h1>
          </div>
          {canWrite ? <button type="button" className={workspace.primaryButton} onClick={() => setShowCreate(true)}><Plus size={15} aria-hidden="true" />AI Agent 추가</button> : null}
        </header>

        <AiExecutionStatus
          execution={state.aiExecution}
          credential={state.aiCredential}
          readOnly={readOnly}
          onOpenSettings={() => setShowCredentialSettings(true)}
        />

        {error ? <p className={styles.pageError} role="alert">{error}</p> : null}

        {aiAgents.length === 0 || !selectedAiMember || !selectedAiAgent ? (
          <article className={`${workspace.card} ${styles.emptyAgent}`}>
            <span className={styles.emptyIcon}><Bot size={24} aria-hidden="true" /></span>
            <div>
              <h2>이 프로젝트에는 아직 AI Agent가 없습니다.</h2>
              <p>프로젝트 역할에 맞는 AI Agent를 추가하고, 기존 할 일을 배정해 결과를 만들어 보세요.</p>
            </div>
          </article>
        ) : (
          <div className={styles.agentHub}>
            <section className={`${workspace.card} ${styles.agentPicker}`} aria-label="AI Agent 선택">
              <header><div><Bot size={16} aria-hidden="true" /><h2>프로젝트 AI Agent</h2></div><span><b className={workspace.mono}>{aiAgents.length}</b>명</span></header>
              <div className={styles.agentList}>
                {aiAgents.map((agent) => {
                  const member = memberById.get(agent.memberId)
                  if (!member) return null
                  return (
                    <button type="button" key={agent.memberId} aria-pressed={agent.memberId === selectedMemberId} onClick={() => selectAgent(agent.memberId)} disabled={Boolean(runningRequest)}>
                      <Avatar member={member} />
                      <span><strong>{member.name}</strong><small>{member.role}</small></span>
                      <i className={agent.enabled ? styles.agentEnabled : styles.agentDisabled}>{agent.enabled ? '활성' : '비활성'}</i>
                    </button>
                  )
                })}
              </div>
            </section>

            <div className={styles.agentWorkspace}>
              <div className={styles.aiIdentity}>
                <Avatar member={selectedAiMember} size="large" />
                <div>
                  <div><h2>{selectedAiMember.name}</h2><em>{agentEnabled ? '활성' : '비활성'}</em></div>
                  <p>{selectedAiMember.role} · {selectedAiMember.description || '소개가 없습니다.'}</p>
                </div>
                {canWrite ? <button type="button" className={styles.enableButton} onClick={changeEnabled} disabled={changingEnabled}>{changingEnabled ? '변경 중...' : agentEnabled ? <><PauseCircle size={14} aria-hidden="true" />비활성화</> : <><Play size={14} aria-hidden="true" />활성화</>}</button> : null}
              </div>

              {!agentEnabled ? <p className={styles.disabledNotice}><PauseCircle size={15} aria-hidden="true" />비활성 AI Agent는 새 할 일을 배정하거나 AI 작업을 실행할 수 없습니다. 설정과 실행 이력은 유지됩니다.</p> : null}

              <div className={styles.layout}>
                <div className={styles.leftColumn}>
                  <article className={`${workspace.card} ${styles.settingsCard}`}>
                    <header><div><Sparkles size={16} aria-hidden="true" /><h2>Agent 기본 정보</h2></div></header>
                    <div className={styles.settingsFields}>
                      <div className={`${forms.field} ${styles.nameRoleField}`}>
                        <span className={forms.label}>이름 · 역할</span>
                        <div className={styles.nameRoleInputs}>
                          <input className={forms.input} disabled={!canWrite || saving} value={profile.name} onChange={(event) => updateProfile('name', event.target.value)} maxLength={80} aria-label="AI Agent 이름" placeholder="예: 자료조사 AI" />
                          <input className={forms.input} disabled={!canWrite || saving} value={profile.role} onChange={(event) => updateProfile('role', event.target.value)} maxLength={120} aria-label="AI Agent 역할" placeholder="예: 시장 조사" />
                        </div>
                      </div>
                      <label className={forms.field}><span className={forms.label}>소개</span><textarea className={`${forms.textarea} ${styles.descriptionTextarea}`} disabled={!canWrite || saving} value={profile.description} onChange={(event) => updateProfile('description', event.target.value)} maxLength={500} aria-label="AI Agent 소개" placeholder="이 Agent가 프로젝트에서 맡는 일을 간단히 설명하세요" /></label>
                      <label className={forms.field}><span className={forms.label}>역할 프롬프트</span><textarea className={`${forms.textarea} ${styles.instructionsTextarea}`} disabled={!canWrite || saving} value={instructions} onChange={(event) => updateInstructions(event.target.value)} maxLength={10_000} aria-label="AI 역할 프롬프트" placeholder="AI Agent가 따라야 할 역할과 작업 원칙을 입력하세요" /></label>
                    </div>
                  </article>

                  <article className={`${workspace.card} ${styles.contextCard}`}>
                    <header><h2>참고할 컨텍스트</h2><p>실행 결과에 포함할 프로젝트 정보를 선택하세요.</p></header>
                    <div>{contextOptions.map(([key, label, description]) => (
                      <label key={key}>
                        <span><strong>{label}</strong><small>{description}</small></span>
                        <input disabled={!canWrite || saving} type="checkbox" checked={Boolean(contextConfig[key])} onChange={() => toggleContext(key)} aria-label={label} />
                        <i aria-hidden="true" />
                      </label>
                    ))}</div>
                    {canWrite ? <footer><button type="button" onClick={saveSettings} disabled={saving || !profile.name.trim() || !profile.role.trim()}><Save size={14} aria-hidden="true" />{saving ? '저장 중...' : '설정 저장'}</button></footer> : null}
                  </article>
                </div>

                <div className={styles.rightColumn}>
                  <article className={`${workspace.card} ${styles.tasksCard}`}>
                    <header className={workspace.sectionHeader}><div><ClipboardList size={16} aria-hidden="true" /><h2>AI 담당 할 일</h2></div><span><b className={workspace.mono}>{aiTasks.length}</b>개</span></header>
                    {aiTasks.length === 0 ? <p className={workspace.empty}>할 일 생성·수정 화면에서 이 AI Agent를 담당자로 지정해 주세요.</p> : (
                      <ul className={styles.taskList}>{aiTasks.map((task) => {
                        const blockingRun = blockingRunByTaskId.get(task.id)
                        const isRunning = (
                          runningRequest?.memberId === selectedMemberId
                          && runningRequest.taskId === task.id
                        )
                        const completed = task.status === TASK_STATUS.COMPLETED
                        const applied = blockingRun?.status === AI_RUN_STATUS.APPLIED
                        const runBlocked = !agentEnabled || !executionReady || completed || Boolean(runningRequest) || Boolean(blockingRun)
                        const buttonTitle = !agentEnabled
                          ? '비활성 AI Agent는 실행할 수 없습니다.'
                          : !executionReady
                            ? 'Gemini API 키를 먼저 설정해 주세요.'
                          : applied
                            ? '공유 노트에 반영한 결과는 다시 실행할 수 없습니다.'
                            : completed
                              ? '완료된 할 일은 실행할 수 없습니다.'
                              : undefined
                        const buttonLabel = isRunning
                          ? '작업 중'
                          : applied
                            ? '반영 완료'
                            : blockingRun
                              ? '검토 대기'
                              : !agentEnabled
                                ? '비활성'
                                : !executionReady
                                  ? 'API 키 필요'
                                : completed
                                  ? '실행 완료'
                                  : liveExecution ? 'AI 작업 실행' : '모의 작업 실행'
                        return <li key={task.id}><div><strong>{task.title}</strong><span>{TASK_STATUS_LABEL[task.status]} · 마감 <b className={workspace.mono}>{formatShortDate(task.dueDate)}</b></span></div>{canWrite ? <button type="button" onClick={() => runTask(task.id)} disabled={runBlocked} title={buttonTitle}><Play size={13} aria-hidden="true" />{buttonLabel}</button> : null}</li>
                      })}</ul>
                    )}
                  </article>

                  <article className={`${workspace.card} ${styles.resultCard}`}>
                    <header className={workspace.sectionHeader}><h2>실행 결과</h2>{runningTask ? <RunStatus status={AI_RUN_STATUS.RUNNING} /> : selectedRunStale ? <span className={`${styles.historyBadge} ${styles.history_failed}`}>재시도 필요</span> : selectedRun ? <RunStatus status={selectedRun.status} /> : null}</header>
                    {runningTask ? (
                      <div className={styles.runningState} role="status" aria-live="polite">
                        <Sparkles size={22} aria-hidden="true" />
                        <strong>{runningTask.title}</strong>
                        <p>계획·결과·자체 점검을 진행 중입니다.</p>
                        <small>완료되면 최종 결과를 검토할 수 있습니다.</small>
                      </div>
                    ) : selectedRunStale ? (
                      <div className={styles.staleRunState} role="status">
                        <XCircle size={22} aria-hidden="true" />
                        <strong>실행이 오래 멈춰 있습니다.</strong>
                        <p>할 일에서 다시 실행해 주세요.</p>
                      </div>
                    ) : selectedRun ? <>
                      <div className={styles.resultMeta}>
                        <strong>{selectedTask?.title ?? selectedRun.contextSnapshot?.task?.title ?? '삭제된 할 일'}</strong>
                        <span className={styles.resultMetaAside}>
                          {selectedAgentTrace ? <i className={styles.attemptBadge}>{selectedAgentTrace.attemptCount === 2 ? '1회 보완됨' : '1회 생성'}</i> : null}
                          <span className={workspace.mono}>{formatShortDate(selectedRun.createdAt)}</span>
                        </span>
                      </div>
                      <div className={styles.resultBody}>
                        <div className={styles.markdownResult}>{selectedRun.resultMarkdown ? <MarkdownPreview content={selectedRun.resultMarkdown} /> : <p>{selectedRun.errorMessage || '결과 내용이 없습니다.'}</p>}</div>
                        {selectedAgentTrace ? <AgentTraceDetails trace={selectedAgentTrace} /> : null}
                      </div>
                      {selectedRun.status === AI_RUN_STATUS.PENDING_REVIEW && canWrite ? <div className={styles.reviewActions}><button type="button" className={styles.rejectButton} onClick={() => reviewRun('reject')} disabled={reviewingRunId === selectedRun.id}><XCircle size={14} aria-hidden="true" />보류</button><button type="button" className={styles.applyButton} onClick={() => reviewRun('apply')} disabled={reviewingRunId === selectedRun.id}><FileCheck size={14} aria-hidden="true" />{reviewingRunId === selectedRun.id ? '처리 중...' : '공유 노트로 반영'}</button></div> : null}
                      {selectedRun.status === AI_RUN_STATUS.APPLIED && selectedRun.appliedNoteId ? <Link className={styles.noteLink} to={`../notes?note=${selectedRun.appliedNoteId}`}><Check size={14} aria-hidden="true" />반영된 공유 노트 보기</Link> : null}
                    </> : <p className={workspace.empty}>AI 담당 할 일을 실행하면 검토할 결과가 여기에 표시됩니다.</p>}
                  </article>
                </div>
              </div>

              <article className={`${workspace.card} ${styles.historyCard}`}>
                <header className={workspace.sectionHeader}><h2>실행 이력</h2><span><b className={workspace.mono}>{aiRuns.length}</b>건</span></header>
                {aiRuns.length === 0 ? <p className={workspace.empty}>아직 실행 이력이 없습니다.</p> : <div className={styles.historyList}>{aiRuns.map((run) => {
                  const task = run.taskId ? taskById.get(run.taskId) : null
                  return <button type="button" key={run.id} aria-pressed={run.id === selectedRunId} onClick={() => setSelectedRunId(run.id)}><span><strong>{task?.title ?? run.contextSnapshot?.task?.title ?? '삭제된 할 일'}</strong><small className={workspace.mono}>{formatShortDate(run.createdAt)}</small></span><RunStatus status={run.status} /></button>
                })}</div>}
              </article>
            </div>
          </div>
        )}

        {showCreate && canWrite ? <CreateAiAgentModal projectId={project.id} onClose={() => setShowCreate(false)} onCreated={({ member }) => { selectAgent(member.id); showFeedback(`${member.name} AI Agent를 프로젝트에 추가했습니다.`) }} /> : null}
        {showCredentialSettings && !readOnly ? <AiCredentialSettingsModal onClose={() => setShowCredentialSettings(false)} /> : null}
        <div className={styles.liveFeedback} aria-live="polite">{feedback}</div>
      </div>
    </section>
  )
}

function RunStatus({ status }) {
  return <span className={`${styles.historyBadge} ${styles[`history_${status}`]}`}>{status === AI_RUN_STATUS.APPLIED ? <Check size={11} aria-hidden="true" /> : null}{runStatusLabel[status] ?? status}</span>
}

function AgentTraceDetails({ trace }) {
  const reviewItems = [
    ['역할 준수', trace.selfReview.roleFollowed],
    ['요구사항 충족', trace.selfReview.requirementsMet],
    ['선택 자료 준수', trace.selfReview.selectedContextOnly],
  ]

  return (
    <div className={styles.traceSections}>
      <details className={styles.traceDetails}>
        <summary>작업 계획</summary>
        <ol>{trace.plan.map((step, index) => <li key={`${index}-${step}`}>{step}</li>)}</ol>
      </details>
      <details className={styles.traceDetails}>
        <summary>자체 점검</summary>
        <ul className={styles.reviewChecklist}>{reviewItems.map(([label, passed]) => (
          <li key={label}><span>{label}</span><b className={passed ? styles.reviewPassed : styles.reviewIssue}>{passed ? '확인' : '문제'}</b></li>
        ))}</ul>
        {trace.selfReview.issues.length > 0 ? <div className={styles.reviewIssues}><strong>발견한 문제</strong><ul>{trace.selfReview.issues.map((issue, index) => <li key={`${index}-${issue}`}>{issue}</li>)}</ul></div> : null}
        <div className={styles.nextAction}><strong>제안하는 다음 행동</strong><p>{trace.suggestedNextAction}</p></div>
      </details>
    </div>
  )
}

function displayAgentTrace(trace) {
  if (!trace || trace.version !== 1 || !Array.isArray(trace.plan) || trace.plan.length < 1) return null
  if (!trace.plan.every((step) => typeof step === 'string' && step.trim())) return null
  if (![1, 2].includes(trace.attemptCount)) return null
  if ((trace.attemptCount === 1 && trace.repaired !== false) || (trace.attemptCount === 2 && trace.repaired !== true)) return null
  const review = trace.selfReview
  if (!review || typeof review !== 'object' || !Array.isArray(review.issues)) return null
  if (!['roleFollowed', 'requirementsMet', 'selectedContextOnly'].every((key) => typeof review[key] === 'boolean')) return null
  if (!review.issues.every((issue) => typeof issue === 'string' && issue.trim())) return null
  if (typeof trace.suggestedNextAction !== 'string' || !trace.suggestedNextAction.trim()) return null
  return trace
}

function profileValues(member) {
  return { name: member?.name ?? '', role: member?.role ?? '', description: member?.description ?? '' }
}

function errorMessage(error, fallback) {
  return error instanceof Error ? error.message : fallback
}
