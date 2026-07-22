import {
  isScenarioId,
  isSituationForScenario,
  isSituationId,
  isToneLevel,
  type Mode,
  type ScenarioId,
  type SituationId,
  type ToneLevel,
} from '../../entities/message/index.js'
import type { GenerationRoute } from '../generation/index.js'

export const interactionEventNames = [
  'result_shown',
  'refinement_opened',
  'regeneration_requested',
  'copy_succeeded',
  'situation_change',
] as const

export type InteractionEventName = (typeof interactionEventNames)[number]
export type InteractionResultRoute = GenerationRoute | 'email_template'

type InteractionEventBase = {
  eventName: InteractionEventName
  mode: Mode
  route: InteractionResultRoute
  scenarioId: ScenarioId
  situationId?: SituationId
}

export type CopySucceededInteraction = InteractionEventBase & {
  eventName: 'copy_succeeded'
  toneLevel: ToneLevel
}

export type NonCopyInteraction = InteractionEventBase & {
  eventName: Exclude<InteractionEventName, 'copy_succeeded'>
  toneLevel?: never
}

export type InteractionEvent = CopySucceededInteraction | NonCopyInteraction

type RecordValue = Record<string, unknown>

const isRecord = (value: unknown): value is RecordValue =>
  typeof value === 'object' && value !== null

const hasOnlyKeys = (value: RecordValue, keys: readonly string[]) =>
  Object.keys(value).every((key) => keys.includes(key))

const isMode = (value: unknown): value is Mode => value === 'reply' || value === 'initiate'

const isInteractionEventName = (value: unknown): value is InteractionEventName =>
  typeof value === 'string' && interactionEventNames.includes(value as InteractionEventName)

const isInteractionResultRoute = (value: unknown): value is InteractionResultRoute =>
  value === 'template_fallback' ||
  value === 'guided_ai' ||
  value === 'manual_ai' ||
  value === 'email_template'

const routeSituationIsValid = (
  route: InteractionResultRoute,
  scenarioId: ScenarioId,
  situationId: unknown,
) => {
  if (route === 'guided_ai' || route === 'template_fallback') {
    return isSituationId(situationId) && isSituationForScenario(scenarioId, situationId)
  }
  return situationId === undefined
}

export const parseInteractionEvent = (value: unknown): InteractionEvent | null => {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, ['eventName', 'mode', 'route', 'scenarioId', 'situationId', 'toneLevel']) ||
    !isInteractionEventName(value.eventName) ||
    !isMode(value.mode) ||
    !isInteractionResultRoute(value.route) ||
    !isScenarioId(value.scenarioId) ||
    !routeSituationIsValid(value.route, value.scenarioId, value.situationId) ||
    (value.route === 'email_template' && value.scenarioId !== 'professor')
  ) {
    return null
  }

  const base = {
    eventName: value.eventName,
    mode: value.mode,
    route: value.route,
    scenarioId: value.scenarioId,
    ...(isSituationId(value.situationId) ? { situationId: value.situationId } : {}),
  }

  if (value.eventName === 'copy_succeeded') {
    if (!isToneLevel(value.toneLevel)) return null
    return { ...base, eventName: 'copy_succeeded', toneLevel: value.toneLevel }
  }

  if (value.toneLevel !== undefined) return null
  return { ...base, eventName: value.eventName }
}

