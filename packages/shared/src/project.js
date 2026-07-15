export const PROJECT_STATUS = Object.freeze({
  NOT_STARTED: 'not_started',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
})

/**
 * @typedef {'not_started' | 'in_progress' | 'completed'} ProjectStatus
 */

/**
 * @typedef {object} ProjectMember
 * @property {string} id
 * @property {string} name
 * @property {string} initial
 * @property {string} color
 * @property {boolean} [isAi]
 */

/**
 * @typedef {object} ProjectSummary
 * @property {string} id
 * @property {string} name
 * @property {string} description
 * @property {ProjectStatus} status
 * @property {number} progress
 * @property {ProjectMember[]} members
 * @property {string} startDate ISO 8601 calendar date
 * @property {string} endDate ISO 8601 calendar date
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
