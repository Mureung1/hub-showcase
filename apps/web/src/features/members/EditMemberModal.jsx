import { useState } from 'react'

import forms from '../../components/ui/forms.module.css'
import { Modal } from '../../components/ui/Modal.jsx'
import { useTeamFlow } from '../../state/useTeamFlow.js'
import styles from './MembersPage.module.css'

export function EditMemberModal({ member, onClose }) {
  const { actions } = useTeamFlow()
  const [values, setValues] = useState({
    role: member.role ?? '',
    description: member.description ?? '',
    color: member.color ?? '#3a6898',
  })
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function change(key, value) {
    setValues((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: undefined }))
    setSubmitError('')
  }

  async function submit(event) {
    event.preventDefault()
    const nextErrors = {}
    if (!values.role.trim()) nextErrors.role = '역할을 입력해 주세요.'
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    setSubmitting(true)
    setSubmitError('')
    const patch = {
      role: values.role.trim(),
      description: values.description.trim(),
      color: values.color,
    }
    try {
      await actions.updateMember(member.id, patch)
      onClose()
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : '협업자 정보를 수정하지 못했습니다.')
      setSubmitting(false)
    }
  }

  return (
    <Modal title="협업자 정보 수정" onClose={onClose} footer={<><button type="button" className={`${forms.footerButton} ${forms.cancelButton}`} onClick={onClose} disabled={submitting}>취소</button><button type="submit" form="edit-member-form" className={`${forms.footerButton} ${forms.submitButton}`} disabled={submitting}>{submitting ? '저장 중...' : '저장'}</button></>}>
      <form id="edit-member-form" className={forms.form} onSubmit={submit} aria-busy={submitting}>
        {submitError ? <p className={forms.error} role="alert">{submitError}</p> : null}
        <div className={forms.field}>
          <span className={forms.label}>Google 계정</span>
          <div className={styles.accountSummary}><strong>{member.name}</strong>{member.email ? <span>{member.email}</span> : null}</div>
          <span className={forms.optional}>Google 계정의 이름, 이메일과 프로필 이미지는 여기서 바꿀 수 없습니다.</span>
        </div>
        <label className={forms.field}><span className={forms.label}>프로젝트 역할 <em>*</em></span><input className={`${forms.input} ${errors.role ? forms.errorInput : ''}`} value={values.role} onChange={(event) => change('role', event.target.value)} aria-invalid={Boolean(errors.role)} />{errors.role ? <span className={forms.error}>{errors.role}</span> : null}</label>
        <label className={forms.field}><span className={forms.label}>소개 <span className={forms.optional}>(선택)</span></span><textarea className={forms.textarea} value={values.description} onChange={(event) => change('description', event.target.value)} /></label>
        <label className={forms.field}><span className={forms.label}>프로필 색상</span><input type="color" value={values.color} onChange={(event) => change('color', event.target.value)} aria-label="프로필 색상" /></label>
      </form>
    </Modal>
  )
}
