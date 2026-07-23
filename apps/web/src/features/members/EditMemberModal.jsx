import { useState } from 'react'

import forms from '../../components/ui/forms.module.css'
import { Modal } from '../../components/ui/Modal.jsx'
import { useTeamFlow } from '../../state/useTeamFlow.js'
import styles from './MembersPage.module.css'

export function EditMemberModal({ member, onClose }) {
  const { actions } = useTeamFlow()
  const linkedUser = member.kind === 'user' || Boolean(member.authUserId)
  const [values, setValues] = useState({
    name: member.name,
    initial: member.initial ?? '',
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
    if (!linkedUser && !values.name.trim()) nextErrors.name = '이름을 입력해 주세요.'
    if (!linkedUser && (!values.initial.trim() || Array.from(values.initial.trim()).length > 4)) nextErrors.initial = '이니셜은 1자 이상 4자 이하여야 합니다.'
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
      ...(!linkedUser ? { name: values.name.trim(), initial: values.initial.trim() } : {}),
    }
    try {
      await actions.updateMember(member.id, patch)
      onClose()
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : '담당자 정보를 수정하지 못했습니다.')
      setSubmitting(false)
    }
  }

  return (
    <Modal title={linkedUser ? '협업 사용자 정보 수정' : '담당자 수정'} onClose={onClose} footer={<><button type="button" className={`${forms.footerButton} ${forms.cancelButton}`} onClick={onClose} disabled={submitting}>취소</button><button type="submit" form="edit-member-form" className={`${forms.footerButton} ${forms.submitButton}`} disabled={submitting}>{submitting ? '저장 중...' : '저장'}</button></>}>
      <form id="edit-member-form" className={forms.form} onSubmit={submit} aria-busy={submitting}>
        {submitError ? <p className={forms.error} role="alert">{submitError}</p> : null}
        {linkedUser ? (
          <div className={forms.field}>
            <span className={forms.label}>Google 계정</span>
            <div className={styles.accountSummary}><strong>{member.name}</strong>{member.email ? <span>{member.email}</span> : null}</div>
            <span className={forms.optional}>Google 계정의 이름, 이메일과 프로필 이미지는 여기서 바꿀 수 없습니다.</span>
          </div>
        ) : (
          <div className={forms.fieldRow}>
            <label className={forms.field}><span className={forms.label}>이름 <em>*</em></span><input className={`${forms.input} ${errors.name ? forms.errorInput : ''}`} value={values.name} onChange={(event) => change('name', event.target.value)} aria-invalid={Boolean(errors.name)} />{errors.name ? <span className={forms.error}>{errors.name}</span> : null}</label>
            <label className={forms.field}><span className={forms.label}>이니셜 <em>*</em></span><input className={`${forms.input} ${errors.initial ? forms.errorInput : ''}`} value={values.initial} onChange={(event) => change('initial', event.target.value)} maxLength={4} aria-invalid={Boolean(errors.initial)} />{errors.initial ? <span className={forms.error}>{errors.initial}</span> : null}</label>
          </div>
        )}
        <label className={forms.field}><span className={forms.label}>프로젝트 역할 <em>*</em></span><input className={`${forms.input} ${errors.role ? forms.errorInput : ''}`} value={values.role} onChange={(event) => change('role', event.target.value)} aria-invalid={Boolean(errors.role)} />{errors.role ? <span className={forms.error}>{errors.role}</span> : null}</label>
        <label className={forms.field}><span className={forms.label}>소개 <span className={forms.optional}>(선택)</span></span><textarea className={forms.textarea} value={values.description} onChange={(event) => change('description', event.target.value)} /></label>
        <label className={forms.field}><span className={forms.label}>프로필 색상</span><input type="color" value={values.color} onChange={(event) => change('color', event.target.value)} aria-label="프로필 색상" /></label>
      </form>
    </Modal>
  )
}
