import { useState } from 'react'

import forms from '../../components/ui/forms.module.css'
import { Modal } from '../../components/ui/Modal.jsx'
import { useTeamFlow } from '../../state/useTeamFlow.js'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function InviteCollaboratorModal({ projectId, onClose }) {
  const { actions } = useTeamFlow()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function submit(event) {
    event.preventDefault()
    const normalized = email.trim().toLocaleLowerCase('en-US')
    if (!emailPattern.test(normalized)) {
      setError('올바른 Google 이메일 주소를 입력해 주세요.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      await actions.createInvitation(projectId, { inviteeEmail: normalized })
      onClose()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '초대를 만들지 못했습니다.')
      setSubmitting(false)
    }
  }

  return (
    <Modal
      title="협업 사용자 초대"
      onClose={onClose}
      footer={(
        <>
          <button type="button" className={`${forms.footerButton} ${forms.cancelButton}`} onClick={onClose} disabled={submitting}>취소</button>
          <button type="submit" form="invite-collaborator-form" className={`${forms.footerButton} ${forms.submitButton}`} disabled={submitting || !email.trim()}>{submitting ? '초대 중...' : '초대 보내기'}</button>
        </>
      )}
    >
      <form id="invite-collaborator-form" className={forms.form} onSubmit={submit} aria-busy={submitting}>
        <p className={forms.optional}>상대방이 같은 이메일의 Google 계정으로 로그인하면 앱 안에서 초대를 확인할 수 있습니다. 실제 이메일은 발송되지 않습니다.</p>
        <label className={forms.field}>
          <span className={forms.label}>Google 이메일 <em>*</em></span>
          <input type="email" className={`${forms.input} ${error ? forms.errorInput : ''}`} value={email} onChange={(event) => { setEmail(event.target.value); setError('') }} placeholder="teammate@gmail.com" autoComplete="email" aria-invalid={Boolean(error)} aria-describedby={error ? 'invite-email-error' : undefined} />
          {error ? <span id="invite-email-error" className={forms.error} role="alert">{error}</span> : null}
        </label>
      </form>
    </Modal>
  )
}
