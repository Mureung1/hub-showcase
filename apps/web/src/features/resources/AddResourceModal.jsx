import { RESOURCE_TYPE } from '@teamflow/shared'
import { useCallback, useState } from 'react'

import forms from '../../components/ui/forms.module.css'
import { Modal } from '../../components/ui/Modal.jsx'
import { RESOURCE_TYPE_LABEL } from '../../constants/labels.js'
import { todayIso } from '../../lib/format.js'
import { useTeamFlow } from '../../state/useTeamFlow.js'
import { editableResourceTypes, validateResource } from './resourceValidation.js'

export function AddResourceModal({ projectId, folders, defaultParentId = null, onClose }) {
  const { state, actions } = useTeamFlow()
  const [values, setValues] = useState({ name: '', type: RESOURCE_TYPE.DOCUMENT, description: '', url: '', parentId: defaultParentId ?? '' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const closeModal = useCallback(() => {
    if (!submitting) onClose()
  }, [onClose, submitting])

  async function submit(event) {
    event.preventDefault()
    const validationError = validateResource(values)
    if (validationError) {
      setError(validationError)
      return
    }

    setSubmitting(true)
    setError('')
    try {
      await actions.createResource(projectId, {
        name: values.name.trim(),
        type: values.type,
        description: values.description.trim(),
        url: values.url.trim() || null,
        parentId: values.parentId || null,
        ownerId: state.currentUserId,
        updatedAt: todayIso(),
      })
      onClose()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : '자료를 추가하지 못했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      title="자료 추가"
      onClose={closeModal}
      width={460}
      footer={(
        <>
          <button type="button" className={`${forms.footerButton} ${forms.cancelButton}`} onClick={onClose} disabled={submitting}>취소</button>
          <button type="submit" form="new-resource-form" className={`${forms.footerButton} ${forms.submitButton}`} disabled={!values.name.trim() || submitting}>{submitting ? '추가 중…' : '자료 추가'}</button>
        </>
      )}
    >
      <form id="new-resource-form" className={forms.form} onSubmit={submit}>
        <label className={forms.field}>
          <span className={forms.label}>자료 이름 <em>*</em></span>
          <input autoFocus className={`${forms.input} ${error ? forms.errorInput : ''}`} value={values.name} onChange={(event) => { setValues((current) => ({ ...current, name: event.target.value })); setError('') }} placeholder="자료 이름을 입력하세요" aria-invalid={Boolean(error)} aria-describedby={error ? 'resource-error' : undefined} />
        </label>
        <label className={forms.field}>
          <span className={forms.label}>자료 유형 <em>*</em></span>
          <select className={forms.select} value={values.type} onChange={(event) => { setValues((current) => ({ ...current, type: event.target.value })); setError('') }}>
            {editableResourceTypes.map((type) => <option key={type} value={type}>{RESOURCE_TYPE_LABEL[type]}</option>)}
          </select>
        </label>
        <label className={forms.field}>
          <span className={forms.label}>외부 URL {values.type === RESOURCE_TYPE.LINK ? <em>*</em> : <span className={forms.optional}>(선택)</span>}</span>
          <input className={forms.input} type="url" value={values.url} onChange={(event) => { setValues((current) => ({ ...current, url: event.target.value })); setError('') }} placeholder="https://example.com" />
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
        {error ? <p id="resource-error" className={forms.error} role="alert">{error}</p> : null}
      </form>
    </Modal>
  )
}
