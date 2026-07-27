export type CodexEffectiveConfig = {
  readonly projectRootMarkers: readonly string[]
  readonly globalInstructionsFile: string | null
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
