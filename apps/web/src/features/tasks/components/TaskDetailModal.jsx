import { TASK_STATUS } from '@teamflow/shared'
import Calendar from 'lucide-react/dist/esm/icons/calendar-days.mjs'
import Trash2 from 'lucide-react/dist/esm/icons/trash-2.mjs'
import { useState } from 'react'

import { Avatar } from '../../../components/ui/Avatar.jsx'
import forms from '../../../components/ui/forms.module.css'
import { Modal } from '../../../components/ui/Modal.jsx'
import { StatusBadge } from '../../../components/ui/StatusBadge.jsx'
import { TASK_STATUS_LABEL, TASK_STATUS_ORDER } from '../../../constants/labels.js'
import { formatShortDate } from '../../../lib/format.js'
import { selectAssignableProjectMembers } from '../../../state/selectors.js'
import { useTeamFlow } from '../../../state/useTeamFlow.js'
import workspace from '../../../styles/workspace.module.css'
import styles from './TaskModal.module.css'

const statusColors = {
  [TASK_STATUS.NOT_STARTED]: ['#3a3a44', '#ededf0'],
  [TASK_STATUS.IN_PROGRESS]: ['#2e52b0', '#eaf1ff'],
  [TASK_STATUS.IN_REVIEW]: ['#8a5a0a', '#fff6df'],
  [TASK_STATUS.COMPLETED]: ['#1a6040', '#e8f5ee'],
}

export function TaskDetailModal({ task, members, onClose, onDelete, onStatusChange, readOnly = false }) {
  const { state, actions } = useTeamFlow()
  const [editing, setEditing] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [saving, setSaving] = useState(false)
  const [requestError, setRequestError] = useState('')
  const [errors, setErrors] = useState({})
  const [values, setValues] = useState(() => taskValues(task))
  const member = members.find((candidate) => candidate.id === task.assigneeId)
  const assignableMembers = selectAssignableProjectMembers(state, task.projectId)
  const currentDisabledAi = Boolean(member && (member.kind === 'ai' || member.isAi) && !assignableMembers.some((candidate) => candidate.id === member.id))
  const availableMembers = currentDisabledAi ? [...assignableMembers, member] : assignableMembers
  const collaborators = availableMembers.filter((candidate) => candidate.kind === 'user')
  const aiAgents = availableMembers.filter((candidate) => candidate.kind === 'ai' || candidate.isAi)

  function beginEdit() {
    setValues(taskValues(task))
    setErrors({})
    setRequestError('')
    setConfirmingDelete(false)
    setEditing(true)
  }

  function change(key, value) {
    setValues((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: undefined }))
    setRequestError('')
  }

  async function changeStatus(status) {
    if (status === task.status || updatingStatus) return
    setUpdatingStatus(true)
    setRequestError('')
    try {
      if (onStatusChange) await onStatusChange(status)
      else await actions.updateTask(task.id, { status })
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : '진행 상태를 변경하지 못했습니다.')
    } finally {
      setUpdatingStatus(false)
    }
  }

  async function saveTask(event) {
    event.preventDefault()
    const nextErrors = {}
    if (!values.title.trim()) nextErrors.title = '할 일 제목을 입력해 주세요.'
    if (!values.assigneeId) nextErrors.assigneeId = '담당자를 선택해 주세요.'
    if (currentDisabledAi && values.assigneeId === member?.id) nextErrors.assigneeId = '비활성 AI Agent 대신 담당자를 다시 선택해 주세요.'
    if (!values.dueDate) nextErrors.dueDate = '마감일을 선택해 주세요.'
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }
    setSaving(true)
    setRequestError('')
    try {
      await actions.updateTask(task.id, {
        title: values.title.trim(),
        assigneeId: values.assigneeId,
        dueDate: values.dueDate,
        status: values.status,
        description: values.description.trim(),
      })
      setEditing(false)
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : '할 일을 수정하지 못했습니다.')
    } finally {
      setSaving(false)
    }
  }

  async function deleteTask() {
    setDeleting(true)
    setRequestError('')
    try {
      await onDelete(task.id)
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : '할 일을 삭제하지 못했습니다.')
      setDeleting(false)
    }
  }

  const footer = readOnly ? (
    <button type="button" className={styles.closeButton} onClick={onClose}>닫기</button>
  ) : editing ? (
    <>
      <button type="button" className={styles.closeButton} onClick={() => { setEditing(false); setRequestError('') }} disabled={saving}>취소</button>
      <button type="submit" form="task-edit-form" className={styles.saveButton} disabled={saving || !values.title.trim() || !values.assigneeId || !values.dueDate}>{saving ? '저장 중...' : '변경사항 저장'}</button>
    </>
  ) : confirmingDelete ? (
    <>
      <span className={styles.deleteConfirmation}>이 할 일을 삭제할까요?</span>
      <button type="button" className={styles.closeButton} onClick={() => setConfirmingDelete(false)} disabled={deleting}>취소</button>
      <button type="button" className={styles.confirmDeleteButton} onClick={deleteTask} disabled={deleting}>{deleting ? '삭제 중...' : '삭제하기'}</button>
    </>
  ) : (
    <>
      <button type="button" className={styles.deleteButton} onClick={() => setConfirmingDelete(true)}><Trash2 size={14} />할 일 삭제</button>
      <button type="button" className={styles.editButton} onClick={beginEdit}>수정</button>
      <button type="button" className={styles.closeButton} onClick={onClose}>닫기</button>
    </>
  )

  return (
    <Modal title={editing ? '할 일 수정' : '할 일 상세'} onClose={onClose} width={500} footer={footer}>
      {editing ? (
        <form id="task-edit-form" className={forms.form} onSubmit={saveTask} aria-busy={saving}>
          {requestError ? <p className={forms.error} role="alert">{requestError}</p> : null}
          <label className={forms.field}><span className={forms.label}>할 일 제목 <em>*</em></span><input className={`${forms.input} ${errors.title ? forms.errorInput : ''}`} value={values.title} onChange={(event) => change('title', event.target.value)} aria-invalid={Boolean(errors.title)} aria-describedby={errors.title ? 'edit-task-title-error' : undefined} />{errors.title ? <span id="edit-task-title-error" className={forms.error}>{errors.title}</span> : null}</label>
          <div className={forms.fieldRow}>
            <label className={forms.field}><span className={forms.label}>담당 팀원 <em>*</em></span><select className={`${forms.select} ${errors.assigneeId ? forms.errorInput : ''}`} value={values.assigneeId} onChange={(event) => change('assigneeId', event.target.value)} aria-invalid={Boolean(errors.assigneeId)}><AssigneeOptionGroup label="협업 사용자" members={collaborators} />{currentDisabledAi ? <optgroup label="비활성 AI Agent"><option value={member.id} disabled>{member.name} (비활성)</option></optgroup> : null}<AssigneeOptionGroup label="AI Agent" members={aiAgents.filter((candidate) => candidate.id !== member?.id || !currentDisabledAi)} /></select>{errors.assigneeId ? <span className={forms.error}>{errors.assigneeId}</span> : null}</label>
            <label className={forms.field}><span className={forms.label}>마감일 <em>*</em></span><input type="date" className={`${forms.input} ${errors.dueDate ? forms.errorInput : ''}`} value={values.dueDate} onChange={(event) => change('dueDate', event.target.value)} aria-invalid={Boolean(errors.dueDate)} />{errors.dueDate ? <span className={forms.error}>{errors.dueDate}</span> : null}</label>
          </div>
          <div className={forms.field}>
            <span className={forms.label}>진행 상태</span>
            <div className={`${forms.choiceGrid} ${forms.choiceGridTwo}`}>
              {TASK_STATUS_ORDER.map((status) => {
                const [color, background] = statusColors[status]
                return <button key={status} type="button" aria-pressed={values.status === status} className={`${forms.choice} ${values.status === status ? forms.choiceActive : ''}`} style={{ '--choice-color': color, '--choice-background': background }} onClick={() => change('status', status)}>{TASK_STATUS_LABEL[status]}</button>
              })}
            </div>
          </div>
          <label className={forms.field}><span className={forms.label}>설명 <span className={forms.optional}>(선택)</span></span><textarea className={forms.textarea} value={values.description} onChange={(event) => change('description', event.target.value)} /></label>
        </form>
      ) : <div className={styles.detail}>
        {requestError ? <p className={forms.error} role="alert">{requestError}</p> : null}
        <div className={styles.titleRow}><h3>{task.title}</h3><StatusBadge status={task.status} /></div>
        <dl className={styles.meta}>
          <div><dt>담당자</dt><dd>{member ? <span className={workspace.memberLine}><Avatar member={member} />{member.name}</span> : '미지정'}</dd></div>
          <div><dt>마감일</dt><dd className={workspace.mono}><Calendar size={14} />{formatShortDate(task.dueDate)}</dd></div>
        </dl>
        <fieldset className={styles.statusField} disabled={updatingStatus || readOnly}>
          <legend>진행 상태</legend>
          <div className={styles.statusOptions}>
            {TASK_STATUS_ORDER.map((status) => {
              const [color, background] = statusColors[status]
              return <button key={status} type="button" aria-pressed={task.status === status} className={task.status === status ? styles.statusOptionActive : styles.statusOption} style={{ '--status-color': color, '--status-background': background }} onClick={() => changeStatus(status)}>{TASK_STATUS_LABEL[status]}</button>
            })}
          </div>
        </fieldset>
        <div><span className={styles.descriptionLabel}>설명</span><p className={styles.description}>{task.description || '설명이 없습니다.'}</p></div>
      </div>}
    </Modal>
  )
}

function taskValues(task) {
  return {
    title: task.title,
    assigneeId: task.assigneeId,
    dueDate: task.dueDate,
    status: task.status,
    description: task.description ?? '',
  }
}

function AssigneeOptionGroup({ label, members }) {
  if (members.length === 0) return null
  return <optgroup label={label}>{members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</optgroup>
}
