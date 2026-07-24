import { useState } from 'react'

import forms from '../../components/ui/forms.module.css'
import { Modal } from '../../components/ui/Modal.jsx'
import { useTeamFlow } from '../../state/useTeamFlow.js'

const DEFAULT_CONTEXT = Object.freeze({
  project: true,
  notes: true,
  tasks: true,
  team: false,
  resources: true,
})

const colorOptions = [
  ['', '기본 색상'],
  ['#3d4a63', '슬레이트 네이비'],
  ['#2e52b0', '파랑'],
  ['#1a6040', '초록'],
  ['#6b3e00', '브라운'],
]

export function CreateAiAgentModal({ projectId, onClose, onCreated }) {
  const { actions } = useTeamFlow()
  const [values, setValues] = useState({
    name: '', role: '', description: '', color: '', instructions: '',
  })
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  function change(key, value) {
    setValues((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: undefined }))
    setSubmitError('')
  }

  async function submit(event) {
    event.preventDefault()
    const nextErrors = {}
    if (!values.name.trim()) nextErrors.name = 'AI Agent 이름을 입력해 주세요.'
    if (!values.role.trim()) nextErrors.role = 'AI Agent 역할을 입력해 주세요.'
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    setSubmitting(true)
    setSubmitError('')
    try {
      const result = await actions.createAiAgent(projectId, {
        name: values.name.trim(),
        role: values.role.trim(),
        ...(values.description.trim() ? { description: values.description.trim() } : {}),
        ...(values.color ? { color: values.color } : {}),
        ...(values.instructions.trim() ? { instructions: values.instructions.trim() } : {}),
        contextConfig: DEFAULT_CONTEXT,
      })
      onCreated?.(result)
      onClose()
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'AI Agent를 추가하지 못했습니다.')
      setSubmitting(false)
    }
  }

  return (
    <Modal
      title="AI Agent 추가"
      onClose={onClose}
      width={500}
      footer={<>
        <button type="button" className={`${forms.footerButton} ${forms.cancelButton}`} onClick={onClose} disabled={submitting}>취소</button>
        <button type="submit" form="create-ai-agent-form" className={`${forms.footerButton} ${forms.submitButton}`} disabled={submitting || !values.name.trim() || !values.role.trim()}>{submitting ? '추가 중...' : 'AI Agent 추가'}</button>
      </>}
    >
      <form id="create-ai-agent-form" className={forms.form} onSubmit={submit} aria-busy={submitting}>
        {submitError ? <p className={forms.error} role="alert">{submitError}</p> : null}
        <label className={forms.field}>
          <span className={forms.label}>AI Agent 이름 <em>*</em></span>
          <input autoFocus className={`${forms.input} ${errors.name ? forms.errorInput : ''}`} value={values.name} onChange={(event) => change('name', event.target.value)} maxLength={80} placeholder="예: 시장 분석 Agent" aria-label="AI Agent 이름" aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? 'ai-name-error' : undefined} />
          {errors.name ? <span id="ai-name-error" className={forms.error}>{errors.name}</span> : null}
        </label>
        <label className={forms.field}>
          <span className={forms.label}>역할 <em>*</em></span>
          <input className={`${forms.input} ${errors.role ? forms.errorInput : ''}`} value={values.role} onChange={(event) => change('role', event.target.value)} maxLength={120} placeholder="예: 시장 조사와 경쟁사 분석" aria-label="역할" aria-invalid={Boolean(errors.role)} aria-describedby={errors.role ? 'ai-role-error' : undefined} />
          {errors.role ? <span id="ai-role-error" className={forms.error}>{errors.role}</span> : null}
        </label>
        <label className={forms.field}>
          <span className={forms.label}>소개 <span className={forms.optional}>(선택)</span></span>
          <textarea className={forms.textarea} value={values.description} onChange={(event) => change('description', event.target.value)} maxLength={500} placeholder="이 Agent가 맡을 업무를 간단히 설명해 주세요" />
        </label>
        <label className={forms.field}>
          <span className={forms.label}>색상 <span className={forms.optional}>(선택)</span></span>
          <select className={forms.select} value={values.color} onChange={(event) => change('color', event.target.value)}>
            {colorOptions.map(([value, label]) => <option key={value || 'default'} value={value}>{label}</option>)}
          </select>
        </label>
        <label className={forms.field}>
          <span className={forms.label}>초기 역할 지시사항 <span className={forms.optional}>(선택)</span></span>
          <textarea className={forms.textarea} value={values.instructions} onChange={(event) => change('instructions', event.target.value)} maxLength={10_000} placeholder="이 Agent가 결과를 만들 때 지켜야 할 원칙을 입력하세요" />
        </label>
      </form>
    </Modal>
  )
}
