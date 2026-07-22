export type SemesterWorkspaceErrorCode =
  | 'action_active'
  | 'action_conflict'
  | 'action_invalid'
  | 'course_already_exists'
  | 'course_invalid'
  | 'course_unknown'
  | 'chooser_unavailable'
  | 'material_scan_limit'
  | 'material_stale'
  | 'material_unknown'
  | 'execution_cleanup_required'
  | 'execution_guard_conflict'
  | 'root_invalid'
  | 'root_overlap'
  | 'store_invalid'
  | 'workspace_inactive'
  | 'workspace_incompatible'

export class SemesterWorkspaceError extends Error {
  readonly code: SemesterWorkspaceErrorCode

  constructor(code: SemesterWorkspaceErrorCode, message: string) {
    super(message)
    this.name = 'SemesterWorkspaceError'
    this.code = code
  }
}
