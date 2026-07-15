export const PROJECT_STATUS = Object.freeze({
  NOT_STARTED: 'not_started',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
})

export const TASK_STATUS = Object.freeze({
  NOT_STARTED: 'not_started',
  IN_PROGRESS: 'in_progress',
  IN_REVIEW: 'in_review',
  COMPLETED: 'completed',
})

export const RESOURCE_TYPE = Object.freeze({
  FOLDER: 'folder',
  DOCUMENT: 'document',
  LINK: 'link',
  IMAGE: 'image',
})

/** @typedef {'not_started' | 'in_progress' | 'completed'} ProjectStatus */
/** @typedef {'not_started' | 'in_progress' | 'in_review' | 'completed'} TaskStatus */
/** @typedef {'folder' | 'document' | 'link' | 'image'} ResourceType */

/**
 * @typedef {object} Member
 * @property {string} id
 * @property {string} name
 * @property {string} initial
 * @property {string} role
 * @property {string} description
 * @property {boolean} isAi
 * @property {string} color
 */

/**
 * @typedef {object} Project
 * @property {string} id
 * @property {string} name
 * @property {string} description
 * @property {ProjectStatus} status
 * @property {string} startDate ISO 8601 calendar date
 * @property {string} endDate ISO 8601 calendar date
 * @property {string[]} memberIds
 * @property {string} creatorId
 */

/**
 * @typedef {object} ProjectSummary
 * @property {string} id
 * @property {string} name
 * @property {string} description
 * @property {ProjectStatus} status
 * @property {number} progress
 * @property {Member[]} members
 * @property {string} startDate
 * @property {string} endDate
 */

/**
 * @typedef {object} Task
 * @property {string} id
 * @property {string} projectId
 * @property {string} title
 * @property {string} assigneeId
 * @property {string} dueDate ISO 8601 calendar date
 * @property {TaskStatus} status
 * @property {string} [description]
 * @property {boolean} [isNew]
 */

/**
 * @typedef {object} Note
 * @property {string} id
 * @property {string} projectId
 * @property {string} title
 * @property {string} content
 * @property {string} updatedAt ISO 8601 calendar date
 * @property {string} authorId
 */

/**
 * @typedef {object} Resource
 * @property {string} id
 * @property {string} projectId
 * @property {string} name
 * @property {string} [description]
 * @property {string} ownerId
 * @property {string} updatedAt ISO 8601 calendar date
 * @property {ResourceType} type
 */

/**
 * @typedef {object} AIContext
 * @property {boolean} project
 * @property {boolean} notes
 * @property {boolean} resources
 * @property {boolean} tasks
 * @property {boolean} team
 */

/**
 * Keeps progress values inside the range accepted by the UI and API contract.
 * @param {number} progress
 * @returns {number}
 */
export function normalizeProgress(progress) {
  if (!Number.isFinite(progress)) {
    return 0
  }

  return Math.min(100, Math.max(0, Math.round(progress)))
}

/**
 * Derives project progress from task completion instead of duplicating state.
 * @param {Task[]} tasks
 * @returns {number}
 */
export function calculateProgress(tasks) {
  if (tasks.length === 0) {
    return 0
  }

  return normalizeProgress(
    (tasks.filter((task) => task.status === TASK_STATUS.COMPLETED).length / tasks.length) * 100,
  )
}
