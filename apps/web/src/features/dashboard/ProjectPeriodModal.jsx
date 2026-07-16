import { useState } from 'react'

import forms from '../../components/ui/forms.module.css'
import { Modal } from '../../components/ui/Modal.jsx'
import { useTeamFlow } from '../../state/useTeamFlow.js'

export function ProjectPeriodModal({ project, onClose }) {
  const { actions } = useTeamFlow()
  const [values, setValues] = useState({ startDate: project.startDate, endDate: project.endDate })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  function change(key, value) {
    setValues((current) => ({ ...current, [key]: value }))
    setError('')
  }

  async function submit(event) {
    event.preventDefault()
    if (!values.startDate || !values.endDate) {
      setError('시작일과 종료일을 모두 선택해 주세요.')
      return
    }
    if (values.endDate < values.startDate) {
      setError('종료일은 시작일보다 빠를 수 없습니다.')
      return
    }

    setSaving(true)
    try {
      await actions.updateProject(project.id, values)
      onClose()
    } catch {
      setSaving(false)
      setError('기간을 저장하지 못했습니다. 다시 시도해 주세요.')
    }
  }

  return (
    <Modal
      title="프로젝트 기간 수정"
      onClose={onClose}
      footer={(
        <>
          <button type="button" className={`${forms.footerButton} ${forms.cancelButton}`} onClick={onClose} disabled={saving}>취소</button>
          <button type="submit" form="project-period-form" className={`${forms.footerButton} ${forms.submitButton}`} disabled={saving}>{saving ? '저장 중...' : '기간 저장'}</button>
        </>
      )}
    >
      <form id="project-period-form" className={forms.form} onSubmit={submit}>
        <div className={forms.fieldRow}>
          <label className={forms.field}>
            <span className={forms.label}>시작일 <em>*</em></span>
            <input type="date" className={`${forms.input} ${error ? forms.errorInput : ''}`} value={values.startDate} onChange={(event) => change('startDate', event.target.value)} aria-invalid={Boolean(error)} />
          </label>
          <label className={forms.field}>
            <span className={forms.label}>종료일 <em>*</em></span>
            <input type="date" className={`${forms.input} ${error ? forms.errorInput : ''}`} value={values.endDate} onChange={(event) => change('endDate', event.target.value)} aria-invalid={Boolean(error)} aria-describedby={error ? 'project-period-error' : undefined} />
          </label>
        </div>
        {error ? <p id="project-period-error" className={forms.error} role="alert">{error}</p> : null}
        <p className={forms.optional}>프로젝트 기간만 변경되며 기존 할 일의 마감일은 유지됩니다.</p>
      </form>
    </Modal>
  )
}
