import { useState } from 'react'

import forms from '../../components/ui/forms.module.css'
import { Modal } from '../../components/ui/Modal.jsx'
import { useTeamFlow } from '../../state/useTeamFlow.js'

const colors = ['#3a6898', '#8a4e68', '#2e7878', '#3d7a54', '#48688a', '#6a4878', '#2e6888']

export function AddMemberModal({ projectId, onClose }) {
  const { state, actions } = useTeamFlow()
  const [values, setValues] = useState({ name: '', role: '', description: '' })
  const [errors, setErrors] = useState({})
  const set = (key, value) => { setValues((current) => ({ ...current, [key]: value })); setErrors((current) => ({ ...current, [key]: undefined })) }

  async function submit(event) {
    event.preventDefault()
    const nextErrors = {}
    if (!values.name.trim()) nextErrors.name = '이름을 입력해 주세요.'
    if (!values.role.trim()) nextErrors.role = '역할을 입력해 주세요.'
    if (Object.keys(nextErrors).length > 0) return setErrors(nextErrors)
    await actions.addMember(projectId, {
      name: values.name.trim(), initial: values.name.trim().slice(0, 1), role: values.role.trim(), description: values.description.trim(), color: colors[state.members.filter((member) => !member.isAi).length % colors.length],
    })
    onClose()
  }

  return (
    <Modal title="팀원 추가" onClose={onClose} footer={<><button type="button" className={`${forms.footerButton} ${forms.cancelButton}`} onClick={onClose}>취소</button><button type="submit" form="add-member-form" className={`${forms.footerButton} ${forms.submitButton}`} disabled={!values.name.trim() || !values.role.trim()}>팀원 추가</button></>}>
      <form id="add-member-form" className={forms.form} onSubmit={submit}>
        <label className={forms.field}><span className={forms.label}>이름 <em>*</em></span><input className={`${forms.input} ${errors.name ? forms.errorInput : ''}`} value={values.name} onChange={(event) => set('name', event.target.value)} placeholder="팀원 이름" />{errors.name ? <span className={forms.error}>{errors.name}</span> : null}</label>
        <label className={forms.field}><span className={forms.label}>역할 <em>*</em></span><input className={`${forms.input} ${errors.role ? forms.errorInput : ''}`} value={values.role} onChange={(event) => set('role', event.target.value)} placeholder="예: 프론트엔드 개발 / 디자인" />{errors.role ? <span className={forms.error}>{errors.role}</span> : null}</label>
        <label className={forms.field}><span className={forms.label}>소개 <span className={forms.optional}>(선택)</span></span><textarea className={forms.textarea} value={values.description} onChange={(event) => set('description', event.target.value)} placeholder="팀원에 대한 간단한 소개" /></label>
      </form>
    </Modal>
  )
}
