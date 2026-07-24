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

export const RESOURCE_UPLOAD = Object.freeze({
  BUCKET: 'teamflow-resources',
  MAX_BYTES: 6 * 1024 * 1024,
})

export const PROJECT_ICON = Object.freeze({
  LAYERS: 'layers',
  ROCKET: 'rocket',
  CODE: 'code',
  PALETTE: 'palette',
  MEGAPHONE: 'megaphone',
  BOOK: 'book',
})

export const MEMBER_KIND = Object.freeze({
  USER: 'user',
  AI: 'ai',
})

export const AI_RUN_STATUS = Object.freeze({
  RUNNING: 'running',
  PENDING_REVIEW: 'pending_review',
  APPLIED: 'applied',
  REJECTED: 'rejected',
  FAILED: 'failed',
})

export const AI_CONTEXT_KEYS = Object.freeze([
  'project',
  'notes',
  'tasks',
  'team',
  'resources',
])

export const DEFAULT_AI_CONTEXT_CONFIG = Object.freeze({
  project: true,
  notes: true,
  tasks: true,
  team: false,
  resources: true,
})

export const INVITATION_STATUS = Object.freeze({
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
})

/** @typedef {'not_started' | 'in_progress' | 'completed'} ProjectStatus */
/** @typedef {'layers' | 'rocket' | 'code' | 'palette' | 'megaphone' | 'book'} ProjectIcon */
/** @typedef {'not_started' | 'in_progress' | 'in_review' | 'completed'} TaskStatus */
/** @typedef {'folder' | 'document' | 'link' | 'image'} ResourceType */
/** @typedef {'user' | 'ai'} MemberKind */
/** @typedef {'running' | 'pending_review' | 'applied' | 'rejected' | 'failed'} AIRunStatus */
/** @typedef {'pending' | 'accepted' | 'rejected' | 'cancelled'} InvitationStatus */

/**
 * @typedef {object} Member
 * @property {string} id
 * @property {string} projectId
 * @property {string | null} [authUserId]
 * @property {string | null} [email]
 * @property {MemberKind} kind
 * @property {string} name
 * @property {string} initial
 * @property {string} role
 * @property {string} description
 * @property {boolean} isAi
 * @property {string} color
 * @property {string} [avatarUrl]
 */

/**
 * @typedef {object} Project
 * @property {string} id
 * @property {string} name
 * @property {string} description
 * @property {ProjectStatus} status
 * @property {ProjectIcon} iconKey
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
 * @property {ProjectIcon} iconKey
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
 * @typedef {object} TaskCreateInput
 * @property {string} projectId
 * @property {string} title
 * @property {string} assigneeId
 * @property {string} dueDate ISO 8601 calendar date
 * @property {TaskStatus} status
 * @property {string} [description]
 */

/**
 * @typedef {object} Note
 * @property {string} id
 * @property {string} projectId
 * @property {string} title
 * @property {string} content
 * @property {string} createdAt ISO 8601 timestamp
 * @property {string} updatedAt ISO 8601 timestamp
 * @property {string | null} authorId
 */

/**
 * @typedef {object} Resource
 * @property {string} id
 * @property {string} projectId
 * @property {string} name
 * @property {string} [description]
 * @property {string | null} ownerId
 * @property {string} createdAt ISO 8601 timestamp
 * @property {string} updatedAt ISO 8601 timestamp
 * @property {ResourceType} type
 * @property {string | null} [parentId] Root items use null. Folders must remain at root.
 * @property {string | null} [url] External HTTP(S) URL. Required for link resources.
 * @property {string | null} [storagePath] Private Supabase Storage object path for uploaded files.
 * @property {string | null} [originalName] Original filename supplied by the uploader.
 * @property {string | null} [mimeType] Browser-reported MIME type for the uploaded file.
 * @property {number | null} [sizeBytes] Uploaded file size in bytes.
 * @property {'pending' | 'ready'} [uploadStatus] Pending files remain hidden until Storage confirms upload.
 */

/**
 * @typedef {object} ProjectInvitation
 * @property {string} id
 * @property {string} projectId
 * @property {string} projectName
 * @property {string} inviteeEmail
 * @property {string} invitedBy
 * @property {string} inviterName
 * @property {InvitationStatus} status
 * @property {'received' | 'sent'} direction
 * @property {string} createdAt
 * @property {string | null} [respondedAt]
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
 * @typedef {object} AIAgent
 * @property {string} memberId
 * @property {string} projectId
 * @property {string} instructions
 * @property {AIContext} contextConfig
 * @property {boolean} enabled
 * @property {string} createdAt ISO 8601 timestamp
 * @property {string} updatedAt ISO 8601 timestamp
 */

/**
 * @typedef {object} AIAgentCreateInput
 * @property {string} name
 * @property {string} role
 * @property {string} [description]
 * @property {string} [color]
 * @property {string} [instructions]
 * @property {AIContext} [contextConfig]
 */

/**
 * @typedef {Partial<AIAgentCreateInput> & {enabled?: boolean}} AIAgentUpdateInput
 */

/**
 * @typedef {object} AIRun
 * @property {string} id
 * @property {string} projectId
 * @property {string} aiMemberId
 * @property {string | null} taskId
 * @property {AIRunStatus} status
 * @property {Record<string, unknown>} contextSnapshot
 * @property {string} resultMarkdown
 * @property {string | null} errorMessage
 * @property {string | null} appliedNoteId
 * @property {string | null} createdBy
 * @property {string} createdAt ISO 8601 timestamp
 * @property {string} updatedAt ISO 8601 timestamp
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

/**
 * Checks whether a value is part of the shared task status contract.
 * @param {unknown} value
 * @returns {value is TaskStatus}
 */
export function isTaskStatus(value) {
  return Object.values(TASK_STATUS).includes(value)
}

/**
 * Checks whether a value is part of the shared project status contract.
 * @param {unknown} value
 * @returns {value is ProjectStatus}
 */
export function isProjectStatus(value) {
  return Object.values(PROJECT_STATUS).includes(value)
}

/**
 * Checks whether a value is part of the shared project icon contract.
 * @param {unknown} value
 * @returns {value is ProjectIcon}
 */
export function isProjectIcon(value) {
  return Object.values(PROJECT_ICON).includes(value)
}

/**
 * Checks whether a value is part of the shared resource type contract.
 * @param {unknown} value
 * @returns {value is ResourceType}
 */
export function isResourceType(value) {
  return Object.values(RESOURCE_TYPE).includes(value)
}

/**
 * Checks whether a value is part of the shared member kind contract.
 * @param {unknown} value
 * @returns {value is MemberKind}
 */
export function isMemberKind(value) {
  return Object.values(MEMBER_KIND).includes(value)
}

/**
 * Checks whether a value is part of the shared AI execution status contract.
 * @param {unknown} value
 * @returns {value is AIRunStatus}
 */
export function isAiRunStatus(value) {
  return Object.values(AI_RUN_STATUS).includes(value)
}

/**
 * Checks whether a value has every supported AI context toggle as a boolean.
 * @param {unknown} value
 * @returns {value is AIContext}
 */
export function isAiContextConfig(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const keys = Object.keys(value)
  return (
    keys.length === AI_CONTEXT_KEYS.length
    && AI_CONTEXT_KEYS.every((key) => (
      Object.prototype.hasOwnProperty.call(value, key) && typeof value[key] === 'boolean'
    ))
  )
}

/**
 * Checks whether a value is part of the shared invitation status contract.
 * @param {unknown} value
 * @returns {value is InvitationStatus}
 */
export function isInvitationStatus(value) {
  return Object.values(INVITATION_STATUS).includes(value)
}
