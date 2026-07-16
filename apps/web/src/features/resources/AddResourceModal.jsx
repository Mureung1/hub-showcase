import { RESOURCE_TYPE } from '@teamflow/shared'
import { useState } from 'react'

import forms from '../../components/ui/forms.module.css'
import { Modal } from '../../components/ui/Modal.jsx'
import { RESOURCE_TYPE_LABEL } from '../../constants/labels.js'
import { todayIso } from '../../lib/format.js'
import { useTeamFlow } from '../../state/useTeamFlow.js'

const resourceTypes = Object.values(RESOURCE_TYPE).filter((type) => type !== RESOURCE_TYPE.FOLDER)

export function AddResourceModal({ projectId, folders, defaultParentId = null, onClose }) {
  const { state, actions } = useTeamFlow()
  const [values, setValues] = useState({ name: '', type: RESOURCE_TYPE.DOCUMENT, description: '', parentId: defaultParentId ?? '' })
  const [error, setError] = useState('')

  async function submit(event) {
    event.preventDefault()
    if (!values.name.trim()) {
      setError('자료 이름을 입력해 주세요.')
      return
    }
    await actions.createResource(projectId, {
      ...values,
      name: values.name.trim(),
      description: values.description.trim() || undefined,
      parentId: values.parentId || null,
      ownerId: state.currentUserId,
      updatedAt: todayIso(),
    })
    onClose()
  }

  return (
    <Modal
      title="자료 추가"
      onClose={onClose}
      width={460}
      footer={(
        <>
          <button type="button" className={`${forms.footerButton} ${forms.cancelButton}`} onClick={onClose}>취소</button>
          <button type="submit" form="new-resource-form" className={`${forms.footerButton} ${forms.submitButton}`} disabled={!values.name.trim()}>자료 추가</button>
        </>
      )}
    >
      <form id="new-resource-form" className={forms.form} onSubmit={submit}>
        <label className={forms.field}>
          <span className={forms.label}>자료 이름 <em>*</em></span>
          <input autoFocus className={`${forms.input} ${error ? forms.errorInput : ''}`} value={values.name} onChange={(event) => { setValues((current) => ({ ...current, name: event.target.value })); setError('') }} placeholder="자료 이름을 입력하세요" aria-invalid={Boolean(error)} aria-describedby={error ? 'resource-name-error' : undefined} />
          {error ? <span id="resource-name-error" className={forms.error}>{error}</span> : null}
        </label>
        <label className={forms.field}>
          <span className={forms.label}>자료 유형 <em>*</em></span>
          <select className={forms.select} value={values.type} onChange={(event) => setValues((current) => ({ ...current, type: event.target.value }))}>
            {resourceTypes.map((type) => <option key={type} value={type}>{RESOURCE_TYPE_LABEL[type]}</option>)}
          </select>
        </label>
        <label className={forms.field}>
          <span className={forms.label}>위치 <em>*</em></span>
          <select className={forms.select} value={values.parentId} onChange={(event) => setValues((current) => ({ ...current, parentId: event.target.value }))}>
            <option value="">자료실</option>
            {folders.map((folder) => <option key={folder.id} value={folder.id}>{folder.name}</option>)}
          </select>
        </label>
        <label className={forms.field}>
          <span className={forms.label}>설명 <span className={forms.optional}>(선택)</span></span>
          <textarea className={forms.textarea} value={values.description} onChange={(event) => setValues((current) => ({ ...current, description: event.target.value }))} placeholder="자료에 대한 간단한 설명을 입력하세요" />
        </label>
      </form>
    </Modal>
  )
}
