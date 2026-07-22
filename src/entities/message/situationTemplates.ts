import { generatedTemplates } from './templateCompiler/generated/templates.generated.js'
import {
  toneLabels,
  type Candidate,
  type ScenarioId,
  type SituationId,
  type SpeechStyleId,
  type ToneLevel,
} from './message.js'

const toneOrder = [1, 2, 3] as const satisfies readonly ToneLevel[]

const templateKeyFor = (
  scenarioId: ScenarioId,
  situationId: SituationId,
  speechStyleId: SpeechStyleId,
): string => `${scenarioId}/${situationId}/${speechStyleId}`

const templateCandidateIndex = new Map<string, Candidate[]>()

for (const template of generatedTemplates) {
  const key = templateKeyFor(template.scenarioId, template.situationId, template.speechStyleId)
  const candidates = templateCandidateIndex.get(key) ?? []

  candidates.push({
    toneLevel: template.toneLevel,
    toneLabel: toneLabels[template.toneLevel],
    text: template.message,
  })
  templateCandidateIndex.set(key, candidates)
}

export const templateCandidatesFor = (
  scenarioId: ScenarioId,
  situationId: SituationId,
  speechStyleId: SpeechStyleId,
): Candidate[] | null => {
  const candidates = templateCandidateIndex.get(templateKeyFor(scenarioId, situationId, speechStyleId))
  if (
    !candidates ||
    candidates.length !== toneOrder.length ||
    candidates.some((candidate, index) => candidate.toneLevel !== toneOrder[index])
  ) {
    return null
  }

  return candidates.map((candidate) => ({ ...candidate }))
}
