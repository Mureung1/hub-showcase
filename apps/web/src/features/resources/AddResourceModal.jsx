import { RESOURCE_TYPE, RESOURCE_UPLOAD } from '@teamflow/shared'
import { useCallback, useState } from 'react'

import forms from '../../components/ui/forms.module.css'
import { Modal } from '../../components/ui/Modal.jsx'
import { useTeamFlow } from '../../state/useTeamFlow.js'
import styles from './ResourcesPage.module.css'
import { validateResource } from './resourceValidation.js'

const ADD_MODE = Object.freeze({
  FILE: 'file',
  LINK: 'link',
})

const MAX_FILE_SIZE_LABEL = `${RESOURCE_UPLOAD.MAX_BYTES / 1024 / 1024}MB`

function formatFileSize(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10 * 1024 ? 1 : 0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function AddResourceModal({ projectId, folders, defaultParentId = null, onClose }) {
  const { actions } = useTeamFlow()
  const [mode, setMode] = useState(ADD_MODE.FILE)
  const [file, setFile] = useState(null)
  const [values, setValues] = useState({ name: '', description: '', url: '', parentId: defaultParentId ?? '' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const closeModal = useCallback(() => {
    if (!submitting) onClose()
  }, [onClose, submitting])

  async function submit(event) {
    event.preventDefault()
    const validationError = mode === ADD_MODE.FILE
      ? (!file
          ? '업로드할 파일을 선택해 주세요.'
          : file.size <= 0 || file.size > RESOURCE_UPLOAD.MAX_BYTES
            ? `파일은 1바이트 이상 ${MAX_FILE_SIZE_LABEL} 이하여야 합니다.`
            : !values.name.trim()
              ? '자료 이름을 입력해 주세요.'
              : '')
      : validateResource({ ...values, type: RESOURCE_TYPE.LINK })
    if (validationError) {
      setError(validationError)
      return
    }

    setSubmitting(true)
    setError('')
    try {
      const commonInput = {
        name: values.name.trim(),
        description: values.description.trim(),
        parentId: values.parentId || null,
      }
      if (mode === ADD_MODE.FILE) {
        await actions.uploadResource(projectId, { ...commonInput, file })
      } else {
        await actions.createResource(projectId, {
          ...commonInput,
          type: RESOURCE_TYPE.LINK,
          url: values.url.trim(),
        })
      }
      onClose()
    } catch (submitError) {
      setError(submitError instanceof Error
        ? submitError.message
        : mode === ADD_MODE.FILE ? '파일을 업로드하지 못했습니다.' : '링크를 추가하지 못했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  function selectFile(event) {
    const nextFile = event.target.files?.[0] ?? null
    setFile(nextFile)
    setValues((current) => ({
      ...current,
      name: !current.name.trim() || current.name === file?.name
        ? (nextFile?.name ?? '')
        : current.name,
    }))
    setError(nextFile && (nextFile.size <= 0 || nextFile.size > RESOURCE_UPLOAD.MAX_BYTES)
      ? `파일은 1바이트 이상 ${MAX_FILE_SIZE_LABEL} 이하여야 합니다.`
      : '')
  }

  const submitDisabled = submitting
    || !values.name.trim()
    || (mode === ADD_MODE.FILE ? !file || file.size <= 0 || file.size > RESOURCE_UPLOAD.MAX_BYTES : !values.url.trim())

  return (
    <Modal
      title="자료 추가"
      onClose={closeModal}
      width={460}
      footer={(
        <>
          <button type="button" className={`${forms.footerButton} ${forms.cancelButton}`} onClick={onClose} disabled={submitting}>취소</button>
          <button type="submit" form="new-resource-form" className={`${forms.footerButton} ${forms.submitButton}`} disabled={submitDisabled}>
            {submitting ? (mode === ADD_MODE.FILE ? '업로드 중…' : '추가 중…') : (mode === ADD_MODE.FILE ? '파일 업로드' : '링크 추가')}
          </button>
        </>
      )}
    >
      <form id="new-resource-form" className={forms.form} onSubmit={submit}>
        <fieldset className={styles.addModeGroup}>
          <legend>추가 방식</legend>
          <label className={mode === ADD_MODE.FILE ? styles.addModeActive : undefined}>
            <input type="radio" name="resource-add-mode" value={ADD_MODE.FILE} checked={mode === ADD_MODE.FILE} onChange={() => { setMode(ADD_MODE.FILE); setError('') }} />
            파일 업로드
          </label>
          <label className={mode === ADD_MODE.LINK ? styles.addModeActive : undefined}>
            <input type="radio" name="resource-add-mode" value={ADD_MODE.LINK} checked={mode === ADD_MODE.LINK} onChange={() => { setMode(ADD_MODE.LINK); setError('') }} />
            외부 링크
          </label>
        </fieldset>
        {mode === ADD_MODE.FILE ? (
          <label className={forms.field}>
            <span className={forms.label}>업로드할 파일 <em>*</em></span>
            <input
              className={styles.fileInput}
              type="file"
              onChange={selectFile}
              aria-describedby="resource-file-help"
              aria-invalid={Boolean(file && (file.size <= 0 || file.size > RESOURCE_UPLOAD.MAX_BYTES))}
            />
            <span id="resource-file-help" className={styles.fileHelp}>
              {file
                ? <><strong>{file.name}</strong><span>{formatFileSize(file.size)} · 최대 {MAX_FILE_SIZE_LABEL}</span></>
                : <>내 컴퓨터에서 파일을 선택하세요. 최대 {MAX_FILE_SIZE_LABEL}</>}
            </span>
          </label>
        ) : null}
        <label className={forms.field}>
          <span className={forms.label}>자료 이름 <em>*</em></span>
          <input className={`${forms.input} ${error ? forms.errorInput : ''}`} value={values.name} onChange={(event) => { setValues((current) => ({ ...current, name: event.target.value })); setError('') }} placeholder={mode === ADD_MODE.FILE ? '선택한 파일의 표시 이름' : '링크 이름을 입력하세요'} aria-invalid={Boolean(error)} aria-describedby={error ? 'resource-error' : undefined} />
        </label>
        {mode === ADD_MODE.LINK ? (
          <label className={forms.field}>
            <span className={forms.label}>외부 URL <em>*</em></span>
            <input className={forms.input} type="url" value={values.url} onChange={(event) => { setValues((current) => ({ ...current, url: event.target.value })); setError('') }} placeholder="https://example.com" />
          </label>
        ) : null}
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
