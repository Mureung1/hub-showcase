export type PublicPreviewAccountCommand =
  | 'account.login.start'
  | 'account.login.cancel'
  | 'account.logout'
  | 'account.retry'

export type PublicPreviewSetupCommand =
  | 'workspace.parent.select'
  | 'setup.prepare'
  | 'setup.approve'
  | 'setup.resume'
  | 'setup.recover.resume'
  | 'setup.recover.discard'
  | 'setup.recover.manual_guidance'

export type PublicPreviewCommandName =
  | PublicPreviewAccountCommand
  | PublicPreviewSetupCommand

export function hasExactPublicPreviewCommands(
  value: unknown,
  expected: readonly PublicPreviewCommandName[],
): boolean {
  return (
    Array.isArray(value) &&
    value.length === expected.length &&
    value.every((command, index) => command === expected[index])
  )
}

export function isAllowedPublicPreviewAuthUrl(
  value: unknown,
): value is string {
  if (typeof value !== 'string') return false
  try {
    const url = new URL(value)
    return (
      url.protocol === 'https:' &&
      url.username === '' &&
      url.password === '' &&
      url.port === '' &&
      (url.hostname === 'auth.openai.com' || url.hostname === 'chatgpt.com')
    )
  } catch {
    return false
  }
}

export function isExactPublicPreviewApplicationCommand(
  value: unknown,
): value is string {
  return (
    typeof value === 'string' &&
    /^npx ay-ple@[0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z.-]+)?$/.test(value)
  )
}
