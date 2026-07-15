import { TASK_STATUS } from '@teamflow/shared'

import { TASK_STATUS_LABEL } from '../../constants/labels.js'
import styles from './ui.module.css'

const classByStatus = {
  [TASK_STATUS.NOT_STARTED]: styles.statusNotStarted,
  [TASK_STATUS.IN_PROGRESS]: styles.statusInProgress,
  [TASK_STATUS.IN_REVIEW]: styles.statusInReview,
  [TASK_STATUS.COMPLETED]: styles.statusCompleted,
}

export function StatusBadge({ status }) {
  return (
    <span className={`${styles.statusBadge} ${classByStatus[status] ?? ''}`}>
      <span aria-hidden="true" />
      {TASK_STATUS_LABEL[status] ?? status}
    </span>
  )
}
