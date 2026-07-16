import { normalizeProgress, PROJECT_STATUS } from '@teamflow/shared'
import Layers3 from 'lucide-react/dist/esm/icons/layers-3.mjs'

import { formatPeriod } from '../../../lib/format.js'
import styles from './ProjectCard.module.css'

const STATUS_LABEL = Object.freeze({
  [PROJECT_STATUS.NOT_STARTED]: '시작 전',
  [PROJECT_STATUS.IN_PROGRESS]: '진행 중',
  [PROJECT_STATUS.COMPLETED]: '완료',
})

const STATUS_CLASS = Object.freeze({
  [PROJECT_STATUS.NOT_STARTED]: styles.statusPending,
  [PROJECT_STATUS.IN_PROGRESS]: styles.statusProgress,
  [PROJECT_STATUS.COMPLETED]: styles.statusCompleted,
})

/**
 * Displays one project summary without coupling the UI to the data source.
 * @param {{ project: import('@teamflow/shared/project').ProjectSummary }} props
 */
export function ProjectCard({ project, onSelect }) {
  const progress = normalizeProgress(project.progress)
  const titleId = `project-${project.id}-title`
  const memberNames = project.members.map((member) => member.name).join(', ')

  return (
    <article className={styles.card} aria-labelledby={titleId}>
      <button className={styles.cardButton} type="button" onClick={onSelect} aria-label={`${project.name} 프로젝트 열기`}>
      <div className={styles.headingRow}>
        <div className={styles.projectIdentity}>
          <span className={styles.projectIcon} aria-hidden="true">
            <Layers3 size={17} strokeWidth={1.75} />
          </span>
          <div className={styles.projectCopy}>
            <h2 id={titleId}>{project.name}</h2>
            <p>{project.description}</p>
          </div>
        </div>
        <span className={`${styles.status} ${STATUS_CLASS[project.status] ?? ''}`}>
          {STATUS_LABEL[project.status] ?? project.status}
        </span>
      </div>

      <div className={styles.progressSection}>
        <div className={styles.progressHeader}>
          <span>진행률</span>
          <strong className={styles.mono}>{progress}%</strong>
        </div>
        <div
          className={styles.progressTrack}
          role="progressbar"
          aria-label={`${project.name} 진행률`}
          aria-valuemin="0"
          aria-valuemax="100"
          aria-valuenow={progress}
        >
          <span className={styles.progressValue} style={{ '--project-progress': `${progress}%` }} />
        </div>
      </div>

      <div className={styles.footer}>
        <div className={styles.memberStack} aria-label={`참여 멤버: ${memberNames}`}>
          {project.members.map((member) => (
            <span
              className={`${styles.avatar} ${member.isAi ? styles.avatarAi : ''}`}
              key={member.id}
              title={member.name}
              style={{ '--avatar-color': member.color }}
            >
              {member.initial}
            </span>
          ))}
        </div>
        <time className={`${styles.period} ${styles.mono}`}>
          {formatPeriod(project.startDate, project.endDate)}
        </time>
      </div>
      </button>
    </article>
  )
}
