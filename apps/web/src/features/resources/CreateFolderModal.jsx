import { RESOURCE_TYPE } from '@teamflow/shared'
import { useState } from 'react'

import forms from '../../components/ui/forms.module.css'
import { Modal } from '../../components/ui/Modal.jsx'
import { todayIso } from '../../lib/format.js'
import { useTeamFlow } from '../../state/useTeamFlow.js'

export function CreateFolderModal({ projectId, onClose }) {
  const { state, actions } = useTeamFlow()
  const [name, setName] = useState('')
  const [error, setError] = useState('')

  async function submit(event) {
    event.preventDefault()
    const trimmedName = name.trim()
    if (!trimmedName) {
      setError('폴더 이름을 입력해 주세요.')
      return
    }

    await actions.createResource(projectId, {
      name: trimmedName,
      ownerId: state.currentUserId,
      updatedAt: todayIso(),
      type: RESOURCE_TYPE.FOLDER,
      parentId: null,
    })
    onClose()
  }

  return (
    <Modal
      title="새 폴더"
      onClose={onClose}
      footer={(
        <>
          <button type="button" className={`${forms.footerButton} ${forms.cancelButton}`} onClick={onClose}>취소</button>
          <button type="submit" form="new-folder-form" className={`${forms.footerButton} ${forms.submitButton}`} disabled={!name.trim()}>폴더 만들기</button>
        </>
      )}
    >
      <form id="new-folder-form" className={forms.form} onSubmit={submit}>
        <label className={forms.field}>
          <span className={forms.label}>폴더 이름 <em>*</em></span>
          <input autoFocus className={`${forms.input} ${error ? forms.errorInput : ''}`} value={name} onChange={(event) => { setName(event.target.value); setError('') }} placeholder="폴더 이름을 입력하세요" aria-invalid={Boolean(error)} aria-describedby={error ? 'folder-name-error' : undefined} />
          {error ? <span id="folder-name-error" className={forms.error}>{error}</span> : null}
        </label>
        <p className={forms.optional}>폴더는 자료실 최상위에 생성됩니다.</p>
      </form>
    </Modal>
  )
}
