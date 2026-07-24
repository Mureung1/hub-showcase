import { TASK_STATUS } from '@teamflow/shared'
import { useState } from 'react'

import forms from '../../../components/ui/forms.module.css'
import { Modal } from '../../../components/ui/Modal.jsx'
import { TASK_STATUS_LABEL, TASK_STATUS_ORDER } from '../../../constants/labels.js'
import { useTeamFlow } from '../../../state/useTeamFlow.js'

const colors = {
  [TASK_STATUS.NOT_STARTED]: ['#38383f', '#f3f3f5'],
  [TASK_STATUS.IN_PROGRESS]: ['#2a4ca0', '#eef3ff'],
  [TASK_STATUS.IN_REVIEW]: ['#6b3e00', '#fff8ec'],
  [TASK_STATUS.COMPLETED]: ['#175538', '#edf8f2'],
}

export function TaskCreateModal({ projectId, members, onClose }) {
  const { actions } = useTeamFlow()
  const collaborators = members.filter(isAssignableCollaborator)
  const [values, setValues] = useState({ title: '', assigneeId: collaborators[0]?.id ?? '', dueDate: '', status: TASK_STATUS.NOT_STARTED, description: '' })
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const set = (key, value) => {
    setValues((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: undefined }))
    setSubmitError('')
  }

  async function submit(event) {
    event.preventDefault()
    const nextErrors = {}
    if (!values.title.trim()) nextErrors.title = '할 일 제목을 입력해 주세요.'
    if (!values.assigneeId) nextErrors.assigneeId = '담당자를 선택해 주세요.'
    if (!values.dueDate) nextErrors.dueDate = '마감일을 선택해 주세요.'
    if (Object.keys(nextErrors).length > 0) return setErrors(nextErrors)
    setSubmitting(true)
    setSubmitError('')

    try {
      await actions.createTask(projectId, { ...values, title: values.title.trim(), description: values.description.trim() || undefined })
      onClose()
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : '할 일을 저장하지 못했습니다.')
      setSubmitting(false)
    }
  }

  return (
    <Modal title="새 할 일 추가" onClose={onClose} width={480} footer={<><button type="button" className={`${forms.footerButton} ${forms.cancelButton}`} onClick={onClose} disabled={submitting}>취소</button><button type="submit" form="new-task-form" className={`${forms.footerButton} ${forms.submitButton}`} disabled={submitting || !values.title.trim() || !values.dueDate}>{submitting ? '등록 중...' : '할 일 추가'}</button></>}>
      <form id="new-task-form" className={forms.form} onSubmit={submit} aria-busy={submitting}>
        {submitError ? <p role="alert" className={forms.error}>{submitError}</p> : null}
        <label className={forms.field}><span className={forms.label}>할 일 제목 <em>*</em></span><input autoFocus className={`${forms.input} ${errors.title ? forms.errorInput : ''}`} value={values.title} onChange={(event) => set('title', event.target.value)} placeholder="할 일을 입력하세요" aria-invalid={Boolean(errors.title)} aria-describedby={errors.title ? 'task-title-error' : undefined} />{errors.title ? <span id="task-title-error" className={forms.error}>{errors.title}</span> : null}</label>
        <label className={forms.field}><span className={forms.label}>담당 팀원 <em>*</em></span><select className={forms.select} value={values.assigneeId} onChange={(event) => set('assigneeId', event.target.value)} aria-invalid={Boolean(errors.assigneeId)} aria-describedby={errors.assigneeId ? 'task-assignee-error' : undefined}>{collaborators.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select>{errors.assigneeId ? <span id="task-assignee-error" className={forms.error}>{errors.assigneeId}</span> : null}</label>
        <label className={forms.field}><span className={forms.label}>마감일 <em>*</em></span><input type="date" className={`${forms.input} ${errors.dueDate ? forms.errorInput : ''}`} value={values.dueDate} onChange={(event) => set('dueDate', event.target.value)} aria-invalid={Boolean(errors.dueDate)} aria-describedby={errors.dueDate ? 'task-due-date-error' : undefined} />{errors.dueDate ? <span id="task-due-date-error" className={forms.error}>{errors.dueDate}</span> : null}</label>
        <div className={forms.field}><span className={forms.label}>진행 상태 <em>*</em></span><div className={`${forms.choiceGrid} ${forms.choiceGridTwo}`}>{TASK_STATUS_ORDER.map((status) => { const [color, background] = colors[status]; return <button key={status} type="button" aria-pressed={values.status === status} className={`${forms.choice} ${values.status === status ? forms.choiceActive : ''}`} style={{ '--choice-color': color, '--choice-background': background }} onClick={() => set('status', status)}>{TASK_STATUS_LABEL[status]}</button> })}</div></div>
        <label className={forms.field}><span className={forms.label}>설명 <span className={forms.optional}>(선택)</span></span><textarea className={forms.textarea} value={values.description} onChange={(event) => set('description', event.target.value)} placeholder="간단한 설명을 입력하세요" /></label>
      </form>
    </Modal>
  )
}

function isAssignableCollaborator(member) {
  return member.kind === 'user' || member.kind === 'ai'
}
