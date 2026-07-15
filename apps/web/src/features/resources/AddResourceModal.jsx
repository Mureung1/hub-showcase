import { RESOURCE_TYPE } from '@teamflow/shared'
import { useState } from 'react'

import forms from '../../components/ui/forms.module.css'
import { Modal } from '../../components/ui/Modal.jsx'
import { RESOURCE_TYPE_LABEL } from '../../constants/labels.js'
import { todayIso } from '../../lib/format.js'
import { useTeamFlow } from '../../state/useTeamFlow.js'

export function AddResourceModal({ projectId, onClose }) {
  const { state, actions } = useTeamFlow()
  const [values, setValues] = useState({ name: '', type: RESOURCE_TYPE.DOCUMENT, description: '' })
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
          <input autoFocus className={`${forms.input} ${error ? forms.errorInput : ''}`} value={values.name} onChange={(event) => { setValues((current) => ({ ...current, name: event.target.value })); setError('') }} placeholder="자료 이름을 입력하세요" />
          {error ? <span className={forms.error}>{error}</span> : null}
        </label>
        <label className={forms.field}>
          <span className={forms.label}>자료 유형 <em>*</em></span>
          <select className={forms.select} value={values.type} onChange={(event) => setValues((current) => ({ ...current, type: event.target.value }))}>
            {Object.values(RESOURCE_TYPE).map((type) => <option key={type} value={type}>{RESOURCE_TYPE_LABEL[type]}</option>)}
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
