import { PROJECT_STATUS } from '@teamflow/shared'
import Trash2 from 'lucide-react/dist/esm/icons/trash-2.mjs'
import { useState } from 'react'

import forms from '../../../components/ui/forms.module.css'
import { Modal } from '../../../components/ui/Modal.jsx'
import { PROJECT_STATUS_LABEL } from '../../../constants/labels.js'
import { useTeamFlow } from '../../../state/useTeamFlow.js'
import styles from './ProjectSettingsModal.module.css'

const statuses = [PROJECT_STATUS.NOT_STARTED, PROJECT_STATUS.IN_PROGRESS, PROJECT_STATUS.COMPLETED]
const choiceColors = {
  [PROJECT_STATUS.NOT_STARTED]: ['#3a3a44', '#ededf0'],
  [PROJECT_STATUS.IN_PROGRESS]: ['#2e52b0', '#eaf1ff'],
  [PROJECT_STATUS.COMPLETED]: ['#1a6040', '#e8f5ee'],
}

export function ProjectSettingsModal({ project, onClose, onDeleted }) {
  const { actions } = useTeamFlow()
  const [mode, setMode] = useState('edit')
  const [values, setValues] = useState({
    name: project.name,
    description: project.description ?? '',
    status: project.status,
    startDate: project.startDate ?? '',
    endDate: project.endDate ?? '',
  })
  const [confirmation, setConfirmation] = useState('')
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function change(key, value) {
    setValues((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: undefined }))
    setSubmitError('')
  }

  async function save(event) {
    event.preventDefault()
    const nextErrors = {}
    if (!values.name.trim()) nextErrors.name = '프로젝트 이름을 입력해 주세요.'
    if (values.startDate && values.endDate && values.endDate < values.startDate) {
      nextErrors.endDate = '종료일은 시작일보다 빠를 수 없습니다.'
    }
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    setSubmitting(true)
    setSubmitError('')
    try {
      await actions.updateProject(project.id, {
        ...values,
        name: values.name.trim(),
        description: values.description.trim(),
      })
      onClose()
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : '프로젝트를 수정하지 못했습니다.')
      setSubmitting(false)
    }
  }

  async function removeProject(event) {
    event.preventDefault()
    if (confirmation !== project.name || submitting) return
    setSubmitting(true)
    setSubmitError('')
    try {
      await actions.deleteProject(project.id)
      onClose()
      onDeleted?.()
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : '프로젝트를 삭제하지 못했습니다.')
      setSubmitting(false)
    }
  }

  if (mode === 'delete') {
    return (
      <Modal
        title="프로젝트 삭제"
        onClose={onClose}
        footer={(
          <>
            <button type="button" className={`${forms.footerButton} ${forms.cancelButton}`} onClick={() => { setMode('edit'); setSubmitError('') }} disabled={submitting}>돌아가기</button>
            <button type="submit" form="delete-project-form" className={`${forms.footerButton} ${styles.dangerButton}`} disabled={submitting || confirmation !== project.name}>{submitting ? '삭제 중...' : '영구 삭제'}</button>
          </>
        )}
      >
        <form id="delete-project-form" className={forms.form} onSubmit={removeProject} aria-busy={submitting}>
          <div className={styles.dangerNotice}>
            <strong>삭제한 프로젝트는 복구할 수 없습니다.</strong>
            <p>할 일, 노트, 자료, 팀원과 초대 정보가 함께 삭제됩니다.</p>
          </div>
          {submitError ? <p className={forms.error} role="alert">{submitError}</p> : null}
          <label className={forms.field}>
            <span className={forms.label}>확인을 위해 <strong>{project.name}</strong> 입력</span>
            <input className={forms.input} value={confirmation} onChange={(event) => { setConfirmation(event.target.value); setSubmitError('') }} autoComplete="off" />
          </label>
        </form>
      </Modal>
    )
  }

  return (
    <Modal
      title="프로젝트 설정"
      onClose={onClose}
      width={500}
      footer={(
        <>
          <button type="button" className={`${forms.footerButton} ${styles.deleteEntryButton}`} onClick={() => { setMode('delete'); setSubmitError('') }} disabled={submitting}><Trash2 size={14} />프로젝트 삭제</button>
          <button type="button" className={`${forms.footerButton} ${forms.cancelButton}`} onClick={onClose} disabled={submitting}>취소</button>
          <button type="submit" form="project-settings-form" className={`${forms.footerButton} ${forms.submitButton}`} disabled={submitting || !values.name.trim()}>{submitting ? '저장 중...' : '변경사항 저장'}</button>
        </>
      )}
    >
      <form id="project-settings-form" className={forms.form} onSubmit={save} aria-busy={submitting}>
        {submitError ? <p className={forms.error} role="alert">{submitError}</p> : null}
        <label className={forms.field}>
          <span className={forms.label}>프로젝트 이름 <em>*</em></span>
          <input className={`${forms.input} ${errors.name ? forms.errorInput : ''}`} value={values.name} onChange={(event) => change('name', event.target.value)} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? 'settings-project-name-error' : undefined} />
          {errors.name ? <span id="settings-project-name-error" className={forms.error}>{errors.name}</span> : null}
        </label>
        <label className={forms.field}>
          <span className={forms.label}>설명 <span className={forms.optional}>(선택)</span></span>
          <textarea className={forms.textarea} value={values.description} onChange={(event) => change('description', event.target.value)} />
        </label>
        <div className={forms.fieldRow}>
          <label className={forms.field}><span className={forms.label}>시작일</span><input type="date" className={forms.input} value={values.startDate} onChange={(event) => change('startDate', event.target.value)} /></label>
          <label className={forms.field}><span className={forms.label}>종료일</span><input type="date" className={`${forms.input} ${errors.endDate ? forms.errorInput : ''}`} value={values.endDate} onChange={(event) => change('endDate', event.target.value)} aria-invalid={Boolean(errors.endDate)} aria-describedby={errors.endDate ? 'settings-project-end-error' : undefined} />{errors.endDate ? <span id="settings-project-end-error" className={forms.error}>{errors.endDate}</span> : null}</label>
        </div>
        <div className={forms.field}>
          <span className={forms.label}>상태</span>
          <div className={forms.choiceGrid}>
            {statuses.map((status) => {
              const [color, background] = choiceColors[status]
              return <button key={status} type="button" aria-pressed={values.status === status} className={`${forms.choice} ${values.status === status ? forms.choiceActive : ''}`} style={{ '--choice-color': color, '--choice-background': background }} onClick={() => change('status', status)}>{PROJECT_STATUS_LABEL[status]}</button>
            })}
          </div>
        </div>
      </form>
    </Modal>
  )
}
