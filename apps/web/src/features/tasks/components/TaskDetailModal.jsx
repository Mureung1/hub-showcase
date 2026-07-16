import { TASK_STATUS } from '@teamflow/shared'
import Calendar from 'lucide-react/dist/esm/icons/calendar-days.mjs'
import Trash2 from 'lucide-react/dist/esm/icons/trash-2.mjs'
import { useState } from 'react'

import { Avatar } from '../../../components/ui/Avatar.jsx'
import { Modal } from '../../../components/ui/Modal.jsx'
import { StatusBadge } from '../../../components/ui/StatusBadge.jsx'
import { TASK_STATUS_LABEL, TASK_STATUS_ORDER } from '../../../constants/labels.js'
import { formatShortDate } from '../../../lib/format.js'
import workspace from '../../../styles/workspace.module.css'
import styles from './TaskModal.module.css'

const statusColors = {
  [TASK_STATUS.NOT_STARTED]: ['#3a3a44', '#ededf0'],
  [TASK_STATUS.IN_PROGRESS]: ['#2e52b0', '#eaf1ff'],
  [TASK_STATUS.IN_REVIEW]: ['#8a5a0a', '#fff6df'],
  [TASK_STATUS.COMPLETED]: ['#1a6040', '#e8f5ee'],
}

export function TaskDetailModal({ task, members, onClose, onDelete, onStatusChange }) {
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const member = members.find((candidate) => candidate.id === task.assigneeId)

  async function changeStatus(status) {
    if (status === task.status || updatingStatus) return
    setUpdatingStatus(true)
    try {
      await onStatusChange(status)
    } finally {
      setUpdatingStatus(false)
    }
  }

  async function deleteTask() {
    setDeleting(true)
    try {
      await onDelete(task.id)
    } catch {
      setDeleting(false)
    }
  }

  const footer = confirmingDelete ? (
    <>
      <span className={styles.deleteConfirmation}>이 할 일을 삭제할까요?</span>
      <button type="button" className={styles.closeButton} onClick={() => setConfirmingDelete(false)} disabled={deleting}>취소</button>
      <button type="button" className={styles.confirmDeleteButton} onClick={deleteTask} disabled={deleting}>{deleting ? '삭제 중...' : '삭제하기'}</button>
    </>
  ) : (
    <>
      <button type="button" className={styles.deleteButton} onClick={() => setConfirmingDelete(true)}><Trash2 size={14} />할 일 삭제</button>
      <button type="button" className={styles.closeButton} onClick={onClose}>닫기</button>
    </>
  )

  return (
    <Modal title="할 일 상세" onClose={onClose} width={480} footer={footer}>
      <div className={styles.detail}>
        <div className={styles.titleRow}><h3>{task.title}</h3><StatusBadge status={task.status} /></div>
        <dl className={styles.meta}>
          <div><dt>담당자</dt><dd>{member ? <span className={workspace.memberLine}><Avatar member={member} />{member.name}</span> : '미지정'}</dd></div>
          <div><dt>마감일</dt><dd className={workspace.mono}><Calendar size={14} />{formatShortDate(task.dueDate)}</dd></div>
        </dl>
        <fieldset className={styles.statusField} disabled={updatingStatus}>
          <legend>진행 상태</legend>
          <div className={styles.statusOptions}>
            {TASK_STATUS_ORDER.map((status) => {
              const [color, background] = statusColors[status]
              return <button key={status} type="button" aria-pressed={task.status === status} className={task.status === status ? styles.statusOptionActive : styles.statusOption} style={{ '--status-color': color, '--status-background': background }} onClick={() => changeStatus(status)}>{TASK_STATUS_LABEL[status]}</button>
            })}
          </div>
        </fieldset>
        <div><span className={styles.descriptionLabel}>설명</span><p className={styles.description}>{task.description || '설명이 없습니다.'}</p></div>
      </div>
    </Modal>
  )
}
