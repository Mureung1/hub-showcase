export type CodexEffectiveMcpServer = {
  readonly name: string
  readonly enabled: boolean
  readonly required: boolean
  readonly enabledTools: readonly string[] | null
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
