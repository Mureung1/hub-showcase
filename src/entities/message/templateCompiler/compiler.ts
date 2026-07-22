import { createHash } from 'node:crypto'
import {
  templateBundleReviewStatus,
  templateBundleVersion,
  templateScenarioOrder,
  templateSituationOrderByScenario,
  templateSpeechStyleOrder,
  templateToneOrder,
  type CompiledTemplate,
  type CompiledTemplateArtifact,
  type TemplateFrame,
  type TemplateRealization,
  type TemplateRule,
} from './contracts.js'
import { templateFrames } from './frames.js'
import {
  templateIntentMarkers,
  templateRules,
  type TemplatePolicyRule,
} from './rules.js'

const frameKey = (frame: Pick<TemplateFrame, 'scenarioId' | 'situationId'>) =>
  `${frame.scenarioId}.${frame.situationId}`

const ruleKey = (rule: Pick<TemplateRule, 'speechStyleId' | 'toneLevel'>) =>
  `${rule.speechStyleId}.${rule.toneLevel}`

const expectedFrameKeys = templateScenarioOrder.flatMap((scenarioId) =>
  templateSituationOrderByScenario[scenarioId].map(
    (situationId) => `${scenarioId}.${situationId}`,
  ),
)

const assertNonEmpty = (value: string, context: string) => {
  if (value.trim().length === 0) throw new Error(`${context} must not be empty`)
}

const assertCanonicalFrames = (frames: readonly TemplateFrame[]) => {
  const actualKeys = frames.map(frameKey)
  if (actualKeys.length !== expectedFrameKeys.length) {
    throw new Error(`Expected ${expectedFrameKeys.length} template frames, received ${actualKeys.length}`)
  }

  if (new Set(actualKeys).size !== actualKeys.length) {
    throw new Error('Template frame keys must be unique')
  }

  if (actualKeys.some((key, index) => key !== expectedFrameKeys[index])) {
    throw new Error('Template frames must match the canonical scenario and situation order')
  }

  for (const frame of frames) {
    if (frame.facts.length === 0) throw new Error(`${frameKey(frame)} must declare facts`)
    frame.facts.forEach((fact) => assertNonEmpty(fact, `${frameKey(frame)} fact`))
  }
}

const indexRules = (rules: readonly TemplatePolicyRule[]) => {
  const indexed = new Map<string, TemplatePolicyRule>()
  for (const rule of rules) {
    assertNonEmpty(rule.id, 'Template rule id')
    const key = ruleKey(rule)
    if (indexed.has(key)) throw new Error(`Duplicate template rule for ${key}`)
    indexed.set(key, rule)
  }

  const expectedRuleCount = templateSpeechStyleOrder.length * templateToneOrder.length
  if (indexed.size !== expectedRuleCount) {
    throw new Error(`Expected ${expectedRuleCount} template rules, received ${indexed.size}`)
  }
  return indexed
}

const compileRealization = (
  realization: TemplateRealization,
  rule: TemplateRule,
  templateId: string,
) => {
  if (realization.segments.length === 0) {
    throw new Error(`${templateId} must declare at least one semantic segment`)
  }
  if (realization.overrideReason !== undefined) {
    assertNonEmpty(realization.overrideReason, `${templateId} overrideReason`)
  }

  const presentSlots = new Set(realization.segments.map((segment) => segment.slot))
  for (const requiredSlot of rule.requiredSlots) {
    if (!presentSlots.has(requiredSlot)) {
      throw new Error(`${templateId} is missing required slot ${requiredSlot}`)
    }
  }
  for (const forbiddenSlot of rule.forbiddenSlots) {
    if (presentSlots.has(forbiddenSlot)) {
      throw new Error(`${templateId} uses forbidden slot ${forbiddenSlot}`)
    }
  }

  for (const segment of realization.segments) {
    assertNonEmpty(segment.text, `${templateId} ${segment.slot} segment`)
  }
  return realization.segments.map((segment) => segment.text).join('')
}

const assertPolicyBoundaries = (
  frame: TemplateFrame,
  message: string,
  rule: TemplatePolicyRule,
  compiledEntries: readonly CompiledTemplate[],
  templateId: string,
) => {
  if (!rule.speechBoundary.markerAtBoundary.test(message)) {
    throw new Error(
      `${templateId} violates speech-style boundary: ${rule.speechBoundary.description}`,
    )
  }

  const intentMarker = templateIntentMarkers[frame.intent]
  if (rule.toneBoundary.requiresIntentMarker && !intentMarker.pattern.test(message)) {
    throw new Error(`${templateId} violates intent boundary: ${intentMarker.description}`)
  }

  const softenerMarker = rule.toneBoundary.requiredSoftenerMarker
  if (softenerMarker !== undefined && !softenerMarker.test(message)) {
    throw new Error(`${templateId} violates tone boundary: ${rule.toneBoundary.description}`)
  }

  const comparisonTone = rule.toneBoundary.maximumLengthComparedWithTone
  if (comparisonTone !== undefined) {
    const comparison = compiledEntries.find(
      (entry) =>
        entry.scenarioId === frame.scenarioId &&
        entry.situationId === frame.situationId &&
        entry.speechStyleId === rule.speechStyleId &&
        entry.toneLevel === comparisonTone,
    )
    if (!comparison) {
      throw new Error(`${templateId} cannot find comparison tone ${comparisonTone}`)
    }
    if (message.length > comparison.message.length) {
      throw new Error(`${templateId} violates tone boundary: ${rule.toneBoundary.description}`)
    }
  }
}

export const checksumForCompiledTemplates = (entries: readonly CompiledTemplate[]) =>
  createHash('sha256')
    .update(
      JSON.stringify({
        entries,
        reviewStatus: templateBundleReviewStatus,
        version: templateBundleVersion,
      }),
      'utf8',
    )
    .digest('hex')

export const compileTemplateArtifact = (
  frames: readonly TemplateFrame[] = templateFrames,
  rules: readonly TemplatePolicyRule[] = templateRules,
): CompiledTemplateArtifact => {
  assertCanonicalFrames(frames)
  const indexedRules = indexRules(rules)
  const entries: CompiledTemplate[] = []

  for (const frame of frames) {
    for (const speechStyleId of templateSpeechStyleOrder) {
      for (const toneLevel of templateToneOrder) {
        const templateId = `${frame.scenarioId}.${frame.situationId}.${speechStyleId}.${toneLevel}`
        const rule = indexedRules.get(`${speechStyleId}.${toneLevel}`)
        if (!rule) throw new Error(`No template rule exists for ${templateId}`)
        const realization = frame.realizations[speechStyleId][toneLevel]
        const message = compileRealization(realization, rule, templateId)
        assertPolicyBoundaries(frame, message, rule, entries, templateId)
        entries.push({
          message,
          ruleId: rule.id,
          scenarioId: frame.scenarioId,
          situationId: frame.situationId,
          speechStyleId,
          templateId,
          toneLevel,
          version: templateBundleVersion,
          ...(realization.overrideReason === undefined
            ? {}
            : { overrideReason: realization.overrideReason }),
        })
      }
    }
  }

  if (new Set(entries.map((entry) => entry.templateId)).size !== entries.length) {
    throw new Error('Compiled template ids must be unique')
  }

  return {
    entries,
    manifest: {
      checksum: checksumForCompiledTemplates(entries),
      entries: entries.map(({ overrideReason, ruleId, templateId }) => ({
        ruleId,
        templateId,
        ...(overrideReason === undefined ? {} : { overrideReason }),
      })),
      frameCount: frames.length,
      reviewStatus: templateBundleReviewStatus,
      setCount: entries.length / templateToneOrder.length,
      templateCount: entries.length,
      version: templateBundleVersion,
    },
  }
}
