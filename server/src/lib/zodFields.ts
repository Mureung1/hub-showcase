import type { ZodIssue } from 'zod'

export function zodIssuesToFields(issues: ZodIssue[]): Record<string, string> {
  const fields: Record<string, string> = {}
  for (const issue of issues) {
    const key = issue.path[0]
    if (typeof key === 'string' && !(key in fields)) {
      fields[key] = issue.message
    }
  }
  return fields
}
