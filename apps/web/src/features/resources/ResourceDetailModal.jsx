import { RESOURCE_TYPE } from '@teamflow/shared'
import ExternalLink from 'lucide-react/dist/esm/icons/external-link.mjs'
import Pencil from 'lucide-react/dist/esm/icons/pencil.mjs'
import Trash2 from 'lucide-react/dist/esm/icons/trash-2.mjs'
import { useCallback, useEffect, useState } from 'react'

import forms from '../../components/ui/forms.module.css'
import { Modal } from '../../components/ui/Modal.jsx'
import { ResourceIcon } from '../../components/ui/ResourceIcon.jsx'
import { RESOURCE_TYPE_LABEL } from '../../constants/labels.js'
import { formatShortDate } from '../../lib/format.js'
import { useTeamFlow } from '../../state/useTeamFlow.js'
import styles from './ResourcesPage.module.css'
import { editableResourceTypes, isSafeHttpUrl, validateResource } from './resourceValidation.js'

function toValues(resource) {
  return {
    name: resource.name ?? '',
    description: resource.description ?? '',
    type: resource.type,
    url: resource.url ?? '',
    parentId: resource.parentId ?? '',
  }
}

function deletionMessage(error, isFolder) {
  if (isFolder && ['FOLDER_NOT_EMPTY', 'RESOURCE_NOT_EMPTY', 'CONFLICT'].includes(error?.code)) {
    return '폴더 안의 자료를 모두 이동하거나 삭제한 뒤 다시 시도해 주세요.'
  }
  return error instanceof Error ? error.message : '자료를 삭제하지 못했습니다.'
}

export function ResourceDetailModal({ resource, owner, folders, canEdit, onClose, onDeleted }) {
  const { actions } = useTeamFlow()
  const isFolder = resource.type === RESOURCE_TYPE.FOLDER
  const [editing, setEditing] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [values, setValues] = useState(() => toValues(resource))
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const safeUrl = isSafeHttpUrl(resource.url)
  const closeModal = useCallback(() => {
    if (!submitting) onClose()
  }, [onClose, submitting])

  useEffect(() => {
    if (!editing) setValues(toValues(resource))
  }, [editing, resource])

  async function save(event) {
    event.preventDefault()
    const validationError = isFolder
      ? (!values.name.trim() ? '폴더 이름을 입력해 주세요.' : '')
      : validateResource(values)
    if (validationError) {
      setError(validationError)
      return
    }

    setSubmitting(true)
    setError('')
    try {
      const patch = isFolder
        ? { name: values.name.trim(), description: values.description.trim() }
        : {
            name: values.name.trim(),
            description: values.description.trim(),
            type: values.type,
            url: values.url.trim() || null,
            parentId: values.parentId || null,
          }
      await actions.updateResource(resource.id, patch)
      setEditing(false)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : '자료를 수정하지 못했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  async function remove() {
    setSubmitting(true)
    setError('')
    try {
      await actions.deleteResource(resource.id)
      onDeleted(resource.id)
    } catch (deleteError) {
      setError(deletionMessage(deleteError, isFolder))
      setConfirmingDelete(false)
    } finally {
      setSubmitting(false)
    }
  }

  let footer
  if (editing) {
    footer = <><button type="button" className={`${forms.footerButton} ${forms.cancelButton}`} onClick={() => { setEditing(false); setError('') }} disabled={submitting}>취소</button><button type="submit" form="edit-resource-form" className={`${forms.footerButton} ${forms.submitButton}`} disabled={!values.name.trim() || submitting}>{submitting ? '저장 중…' : '저장'}</button></>
  } else if (confirmingDelete) {
    footer = <><button type="button" className={`${forms.footerButton} ${forms.cancelButton}`} onClick={() => setConfirmingDelete(false)} disabled={submitting}>취소</button><button type="button" className={`${forms.footerButton} ${styles.dangerButton}`} onClick={() => void remove()} disabled={submitting}>{submitting ? '삭제 중…' : '삭제'}</button></>
  } else {
    footer = <>{canEdit ? <button type="button" className={styles.deleteButton} onClick={() => { setError(''); setConfirmingDelete(true) }}><Trash2 size={14} />삭제</button> : null}<span className={styles.footerSpacer} />{canEdit ? <button type="button" className={styles.editButton} onClick={() => { setError(''); setEditing(true) }}><Pencil size={14} />수정</button> : null}<button type="button" className={styles.detailClose} onClick={onClose}>확인</button></>
  }

  return (
    <Modal title={editing ? `${isFolder ? '폴더' : '자료'} 수정` : `${isFolder ? '폴더' : '자료'} 상세`} onClose={closeModal} width={480} footer={footer}>
      {editing ? (
        <form id="edit-resource-form" className={forms.form} onSubmit={save}>
          <label className={forms.field}>
            <span className={forms.label}>{isFolder ? '폴더' : '자료'} 이름 <em>*</em></span>
            <input autoFocus className={`${forms.input} ${error ? forms.errorInput : ''}`} value={values.name} onChange={(event) => { setValues((current) => ({ ...current, name: event.target.value })); setError('') }} />
          </label>
          {!isFolder ? <label className={forms.field}><span className={forms.label}>자료 유형 <em>*</em></span><select className={forms.select} value={values.type} onChange={(event) => { setValues((current) => ({ ...current, type: event.target.value })); setError('') }}>{editableResourceTypes.map((type) => <option key={type} value={type}>{RESOURCE_TYPE_LABEL[type]}</option>)}</select></label> : null}
          {!isFolder ? <label className={forms.field}><span className={forms.label}>외부 URL {values.type === RESOURCE_TYPE.LINK ? <em>*</em> : <span className={forms.optional}>(선택)</span>}</span><input className={forms.input} type="url" value={values.url} onChange={(event) => { setValues((current) => ({ ...current, url: event.target.value })); setError('') }} placeholder="https://example.com" /></label> : null}
          {!isFolder ? <label className={forms.field}><span className={forms.label}>위치 <em>*</em></span><select className={forms.select} value={values.parentId} onChange={(event) => setValues((current) => ({ ...current, parentId: event.target.value }))}><option value="">자료실</option>{folders.map((folder) => <option key={folder.id} value={folder.id}>{folder.name}</option>)}</select></label> : null}
          <label className={forms.field}><span className={forms.label}>설명 <span className={forms.optional}>(선택)</span></span><textarea className={forms.textarea} value={values.description} onChange={(event) => setValues((current) => ({ ...current, description: event.target.value }))} /></label>
          {error ? <p className={forms.error} role="alert">{error}</p> : null}
        </form>
      ) : confirmingDelete ? (
        <div className={styles.deleteConfirm}>
          <p><strong>{resource.name}</strong>{isFolder ? ' 폴더' : ' 자료'}를 삭제할까요?</p>
          <span>{isFolder ? '폴더 안에 자료가 있으면 삭제할 수 없습니다.' : '삭제한 자료는 복구할 수 없습니다.'}</span>
          {error ? <small role="alert">{error}</small> : null}
        </div>
      ) : (
        <div className={styles.detailBody}>
          <div className={styles.detailTitle}><ResourceIcon type={resource.type} /><div><h3>{resource.name}</h3><p>{RESOURCE_TYPE_LABEL[resource.type]}</p></div></div>
          <dl>
            <div><dt>등록자</dt><dd>{owner?.name ?? '탈퇴한 사용자'}</dd></div>
            <div><dt>수정일</dt><dd>{formatShortDate(resource.updatedAt)}</dd></div>
            <div className={styles.fullDetail}><dt>설명</dt><dd>{resource.description || '등록된 설명이 없습니다.'}</dd></div>
            {!isFolder ? <div className={styles.fullDetail}><dt>외부 URL</dt><dd>{safeUrl ? <a className={styles.externalLink} href={resource.url} target="_blank" rel="noopener noreferrer">링크 열기<ExternalLink size={13} /></a> : '등록된 링크가 없습니다.'}</dd></div> : null}
          </dl>
          {!canEdit ? <p className={styles.readOnlyNotice}>게스트 모드에서는 자료를 읽기만 할 수 있습니다.</p> : null}
          {error ? <p className={forms.error} role="alert">{error}</p> : null}
        </div>
      )}
    </Modal>
  )
}
