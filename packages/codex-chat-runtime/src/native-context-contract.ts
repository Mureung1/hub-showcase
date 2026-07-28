export type CodexEffectiveMcpEnvironmentVariable = {
  readonly name: string
  readonly source: 'local' | 'remote' | null
}

export type CodexEffectiveMcpServer = {
  readonly name: string
  readonly command: string | null
  readonly args: readonly string[]
  readonly envVars: readonly CodexEffectiveMcpEnvironmentVariable[]
  readonly cwd: string | null
  readonly toolTimeoutSec: number | null
  readonly env: Readonly<Record<string, string>>
  readonly enabled: boolean
  readonly required: boolean
  readonly enabledTools: readonly string[] | null
  readonly disabledTools: readonly string[]
}

export type CodexEffectiveConfig = {
  readonly projectRootMarkers: readonly string[]
  readonly globalInstructionsFile: string | null
  readonly mcpServers: readonly CodexEffectiveMcpServer[]
}

export type CodexEffectiveSkill = {
  readonly name: string
  readonly enabled: boolean
  readonly sourceRoot: string
}

export interface CodexNativeContextPort {
  readEffectiveConfig(input: {
    readonly signal: AbortSignal
  }): Promise<CodexEffectiveConfig>
  listEffectiveSkills(input: {
    readonly signal: AbortSignal
  }): Promise<readonly CodexEffectiveSkill[]>
}
