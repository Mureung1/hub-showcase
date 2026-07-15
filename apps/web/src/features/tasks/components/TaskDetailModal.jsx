import Calendar from 'lucide-react/dist/esm/icons/calendar-days.mjs'

import { Avatar } from '../../../components/ui/Avatar.jsx'
import { Modal } from '../../../components/ui/Modal.jsx'
import { StatusBadge } from '../../../components/ui/StatusBadge.jsx'
import { formatShortDate } from '../../../lib/format.js'
import workspace from '../../../styles/workspace.module.css'
import styles from './TaskModal.module.css'

export function TaskDetailModal({ task, members, onClose }) {
  const member = members.find((candidate) => candidate.id === task.assigneeId)
  return (
    <Modal title="할 일 상세" onClose={onClose} width={480} footer={<button type="button" className={styles.closeButton} onClick={onClose}>닫기</button>}>
      <div className={styles.detail}>
        <div className={styles.titleRow}><h3>{task.title}</h3><StatusBadge status={task.status} /></div>
        <dl className={styles.meta}>
          <div><dt>담당자</dt><dd>{member ? <span className={workspace.memberLine}><Avatar member={member} />{member.name}</span> : '미지정'}</dd></div>
          <div><dt>마감일</dt><dd className={workspace.mono}><Calendar size={14} />{formatShortDate(task.dueDate)}</dd></div>
        </dl>
        <div><span className={styles.descriptionLabel}>설명</span><p className={styles.description}>{task.description || '설명이 없습니다.'}</p></div>
      </div>
    </Modal>
  )
}
