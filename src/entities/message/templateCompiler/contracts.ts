import type { ScenarioId, SituationId, SpeechStyleId, ToneLevel } from '../message.js'

export const templateBundleVersion = 't25-draft-2026-07-20.1' as const
export const templateBundleReviewStatus = 'draft' as const

export const templateScenarioOrder = ['groupwork', 'professor', 'senior', 'friend'] as const satisfies
  readonly ScenarioId[]

export const templateSituationOrderByScenario = {
  groupwork: ['schedule', 'thanks_check', 'ask', 'apologize', 'decline', 'contribution_check'],
  professor: ['schedule', 'thanks_check', 'ask', 'apologize', 'decline', 'absence_inquiry'],
  senior: ['schedule', 'thanks_check', 'ask', 'apologize', 'decline', 'casual_request'],
  friend: ['schedule', 'thanks_check', 'ask', 'apologize', 'decline', 'express_feelings'],
} as const satisfies Record<ScenarioId, readonly SituationId[]>

export const templateSpeechStyleOrder = [
  'seumnida',
  'haeyo',
  'ida',
  'yongyong',
] as const satisfies readonly SpeechStyleId[]

export const templateToneOrder = [1, 2, 3] as const satisfies readonly ToneLevel[]

export const templateSemanticSlotIds = [
  'greeting',
  'context',
  'softener',
  'coreIntent',
  'choice',
  'closing',
] as const

export type TemplateSemanticSlotId = (typeof templateSemanticSlotIds)[number]

export type TemplateIntentId =
  | 'acknowledge'
  | 'apologize_for_late_reply'
  | 'coordinate_schedule'
  | 'decline'
  | 'express_affection'
  | 'inquire_absence_assignment'
  | 'invite_casual_speech'
  | 'request'
  | 'request_progress'

export type TemplateReviewStatus = 'draft' | 'approved' | 'retired'

export type TemplateSegment = {
  slot: TemplateSemanticSlotId
  text: string
}

export type TemplateRealization = {
  segments: readonly TemplateSegment[]
  overrideReason?: string
}

export type TemplateFrame = {
  facts: readonly string[]
  intent: TemplateIntentId
  realizations: Record<SpeechStyleId, Record<ToneLevel, TemplateRealization>>
  scenarioId: ScenarioId
  situationId: SituationId
}

export type TemplateRule = {
  forbiddenSlots: readonly TemplateSemanticSlotId[]
  id: string
  requiredSlots: readonly TemplateSemanticSlotId[]
  speechStyleId: SpeechStyleId
  toneLevel: ToneLevel
}

export type CompiledTemplate = {
  message: string
  overrideReason?: string
  ruleId: string
  scenarioId: ScenarioId
  situationId: SituationId
  speechStyleId: SpeechStyleId
  templateId: string
  toneLevel: ToneLevel
  version: typeof templateBundleVersion
}

export type TemplateManifestEntry = {
  overrideReason?: string
  ruleId: string
  templateId: string
}

export type TemplateManifest = {
  checksum: string
  entries: readonly TemplateManifestEntry[]
  frameCount: number
  reviewStatus: TemplateReviewStatus
  setCount: number
  templateCount: number
  version: typeof templateBundleVersion
}

export type CompiledTemplateArtifact = {
  entries: readonly CompiledTemplate[]
  manifest: TemplateManifest
}
