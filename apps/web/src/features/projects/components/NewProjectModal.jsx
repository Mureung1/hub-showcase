import { PROJECT_STATUS } from '@teamflow/shared'
import { useState } from 'react'

import { PROJECT_STATUS_LABEL } from '../../../constants/labels.js'
import { useTeamFlow } from '../../../state/useTeamFlow.js'
import forms from '../../../components/ui/forms.module.css'
import { Modal } from '../../../components/ui/Modal.jsx'

const statuses = [PROJECT_STATUS.NOT_STARTED, PROJECT_STATUS.IN_PROGRESS, PROJECT_STATUS.COMPLETED]
const choiceColors = {
  [PROJECT_STATUS.NOT_STARTED]: ['#3a3a44', '#ededf0'],
  [PROJECT_STATUS.IN_PROGRESS]: ['#2e52b0', '#eaf1ff'],
  [PROJECT_STATUS.COMPLETED]: ['#1a6040', '#e8f5ee'],
}

export function NewProjectModal({ onClose }) {
  const { actions } = useTeamFlow()
  const [values, setValues] = useState({ name: '', description: '', startDate: '', endDate: '', status: PROJECT_STATUS.IN_PROGRESS })
  const [errors, setErrors] = useState({})

  function change(key, value) {
    setValues((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: undefined }))
  }

  async function submit(event) {
    event.preventDefault()
    const nextErrors = {}
    if (!values.name.trim()) nextErrors.name = '프로젝트 이름을 입력해 주세요.'
    if (values.startDate && values.endDate && values.endDate < values.startDate) nextErrors.endDate = '종료일은 시작일보다 빠를 수 없습니다.'
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }
    await actions.createProject({ ...values, name: values.name.trim(), description: values.description.trim() })
    onClose()
  }

  return (
    <Modal
      title="새 프로젝트 만들기"
      onClose={onClose}
      footer={(
        <>
          <button type="button" className={`${forms.footerButton} ${forms.cancelButton}`} onClick={onClose}>취소</button>
          <button type="submit" form="new-project-form" className={`${forms.footerButton} ${forms.submitButton}`} disabled={!values.name.trim()}>프로젝트 만들기</button>
        </>
      )}
    >
      <form id="new-project-form" className={forms.form} onSubmit={submit}>
        <label className={forms.field}>
          <span className={forms.label}>프로젝트 이름 <em>*</em></span>
          <input className={`${forms.input} ${errors.name ? forms.errorInput : ''}`} value={values.name} onChange={(event) => change('name', event.target.value)} placeholder="예: 교내 해커톤 팀 프로젝트" />
          {errors.name ? <span className={forms.error}>{errors.name}</span> : null}
        </label>
        <label className={forms.field}>
          <span className={forms.label}>설명 <span className={forms.optional}>(선택)</span></span>
          <input className={forms.input} value={values.description} onChange={(event) => change('description', event.target.value)} placeholder="프로젝트에 대한 간단한 설명" />
        </label>
        <div className={forms.fieldRow}>
          <label className={forms.field}><span className={forms.label}>시작일</span><input type="date" className={forms.input} value={values.startDate} onChange={(event) => change('startDate', event.target.value)} /></label>
          <label className={forms.field}><span className={forms.label}>종료일</span><input type="date" className={`${forms.input} ${errors.endDate ? forms.errorInput : ''}`} value={values.endDate} onChange={(event) => change('endDate', event.target.value)} />{errors.endDate ? <span className={forms.error}>{errors.endDate}</span> : null}</label>
        </div>
        <div className={forms.field}>
          <span className={forms.label}>상태</span>
          <div className={forms.choiceGrid}>
            {statuses.map((status) => {
              const [color, background] = choiceColors[status]
              return <button key={status} type="button" className={`${forms.choice} ${values.status === status ? forms.choiceActive : ''}`} style={{ '--choice-color': color, '--choice-background': background }} onClick={() => change('status', status)}>{PROJECT_STATUS_LABEL[status]}</button>
            })}
          </div>
        </div>
      </form>
    </Modal>
  )
}
