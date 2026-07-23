import { RESOURCE_TYPE } from '@teamflow/shared'
import { useCallback, useState } from 'react'

import forms from '../../components/ui/forms.module.css'
import { Modal } from '../../components/ui/Modal.jsx'
import { todayIso } from '../../lib/format.js'
import { useTeamFlow } from '../../state/useTeamFlow.js'

export function CreateFolderModal({ projectId, onClose }) {
  const { state, actions } = useTeamFlow()
  const [values, setValues] = useState({ name: '', description: '' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const closeModal = useCallback(() => {
    if (!submitting) onClose()
  }, [onClose, submitting])

  async function submit(event) {
    event.preventDefault()
    const trimmedName = values.name.trim()
    if (!trimmedName) {
      setError('폴더 이름을 입력해 주세요.')
      return
    }

    setSubmitting(true)
    setError('')
    try {
      await actions.createResource(projectId, {
        name: trimmedName,
        description: values.description.trim(),
        type: RESOURCE_TYPE.FOLDER,
        parentId: null,
        ownerId: state.currentUserId,
        updatedAt: todayIso(),
      })
      onClose()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : '폴더를 만들지 못했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      title="새 폴더"
      onClose={closeModal}
      footer={(
        <>
          <button type="button" className={`${forms.footerButton} ${forms.cancelButton}`} onClick={onClose} disabled={submitting}>취소</button>
          <button type="submit" form="new-folder-form" className={`${forms.footerButton} ${forms.submitButton}`} disabled={!values.name.trim() || submitting}>{submitting ? '만드는 중…' : '폴더 만들기'}</button>
        </>
      )}
    >
      <form id="new-folder-form" className={forms.form} onSubmit={submit}>
        <label className={forms.field}>
          <span className={forms.label}>폴더 이름 <em>*</em></span>
          <input autoFocus className={`${forms.input} ${error ? forms.errorInput : ''}`} value={values.name} onChange={(event) => { setValues((current) => ({ ...current, name: event.target.value })); setError('') }} placeholder="폴더 이름을 입력하세요" aria-invalid={Boolean(error)} aria-describedby={error ? 'folder-error' : undefined} />
        </label>
        <label className={forms.field}>
          <span className={forms.label}>설명 <span className={forms.optional}>(선택)</span></span>
          <textarea className={forms.textarea} value={values.description} onChange={(event) => setValues((current) => ({ ...current, description: event.target.value }))} placeholder="폴더에 대한 간단한 설명을 입력하세요" />
        </label>
        <p className={forms.optional}>폴더는 자료실 최상위에 생성됩니다.</p>
        {error ? <p id="folder-error" className={forms.error} role="alert">{error}</p> : null}
      </form>
    </Modal>
  )
}
