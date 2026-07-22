/// <reference types="node" />

import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { templateCandidatesFor } from '../situationTemplates.js'
import {
  checksumForCompiledTemplates,
  compileTemplateArtifact,
} from './compiler.js'
import {
  templateBundleReviewStatus,
  templateBundleVersion,
  templateScenarioOrder,
  templateSituationOrderByScenario,
  templateSpeechStyleOrder,
  templateToneOrder,
  type TemplateFrame,
} from './contracts.js'
import { templateFrames } from './frames.js'
import { templateRules } from './rules.js'
import {
  generatedManifestPath,
  generatedTemplatesPath,
  serializeTemplateArtifact,
} from './serializer.js'

describe('결정적 템플릿 컴파일러', () => {
  it('정본 순서의 24프레임을 96세트와 288문구로 컴파일한다', () => {
    const artifact = compileTemplateArtifact()
    const expectedFrameKeys = templateScenarioOrder.flatMap((scenarioId) =>
      templateSituationOrderByScenario[scenarioId].map(
        (situationId) => `${scenarioId}.${situationId}`,
      ),
    )

    expect(templateFrames.map((frame) => `${frame.scenarioId}.${frame.situationId}`)).toEqual(
      expectedFrameKeys,
    )
    expect(templateFrames).toHaveLength(24)
    expect(templateFrames.every((frame) => frame.facts.length > 0 && frame.intent.length > 0)).toBe(
      true,
    )
    expect(artifact.manifest).toMatchObject({
      frameCount: 24,
      reviewStatus: templateBundleReviewStatus,
      setCount: 96,
      templateCount: 288,
      version: templateBundleVersion,
    })
    expect(artifact.entries).toHaveLength(288)
  })

  it('현재 T25 검수 원문과 288개 결과가 바이트 단위로 같다', () => {
    const artifact = compileTemplateArtifact()
    const reviewDraft = readFileSync(
      'harness/tasks/T25-situation-card-templates/speech-style-review-draft.md',
      'utf8',
    )
    const reviewTexts = reviewDraft
      .split('\n')
      .filter((line) => /^\| \d+ \|/u.test(line))
      .flatMap((line) => line.split('|').slice(5, 8).map((text) => text.trim()))
    expect(reviewTexts).toHaveLength(288)
    expect(artifact.entries.map((entry) => entry.message)).toEqual(reviewTexts)

    let entryIndex = 0

    for (const scenarioId of templateScenarioOrder) {
      for (const situationId of templateSituationOrderByScenario[scenarioId]) {
        for (const speechStyleId of templateSpeechStyleOrder) {
          const current = templateCandidatesFor(scenarioId, situationId, speechStyleId)
          expect(current, `${scenarioId}/${situationId}/${speechStyleId}`).not.toBeNull()
          for (const toneLevel of templateToneOrder) {
            const entry = artifact.entries[entryIndex]
            expect(entry?.message).toBe(current?.[toneLevel - 1]?.text)
            expect(entry?.toneLevel).toBe(toneLevel)
            entryIndex += 1
          }
        }
      }
    }

    expect(entryIndex).toBe(288)
  })

  it('고유 templateId와 존재하는 ruleId 및 유효한 override provenance를 기록한다', () => {
    const artifact = compileTemplateArtifact()
    const ruleIds = new Set(templateRules.map((rule) => rule.id))
    const templateIds = artifact.entries.map((entry) => entry.templateId)

    expect(new Set(templateIds).size).toBe(288)
    for (const entry of artifact.entries) {
      expect(entry.templateId).toBe(
        `${entry.scenarioId}.${entry.situationId}.${entry.speechStyleId}.${entry.toneLevel}`,
      )
      expect(ruleIds.has(entry.ruleId)).toBe(true)
      expect(entry.version).toBe(templateBundleVersion)
      if (entry.overrideReason !== undefined) expect(entry.overrideReason.trim()).not.toBe('')
    }
  })

  it('12개 규칙이 말끝·화행·완화·간결성 경계를 명시한다', () => {
    expect(templateRules).toHaveLength(12)
    for (const rule of templateRules) {
      expect(rule.speechBoundary.description).not.toBe('')
      expect(rule.speechBoundary.markerAtBoundary).toBeInstanceOf(RegExp)
      expect(rule.toneBoundary.description).not.toBe('')
      expect(rule.toneBoundary.requiresIntentMarker).toBe(true)
      if (rule.toneLevel === 2) {
        expect(rule.toneBoundary.requiredSoftenerMarker).toBeInstanceOf(RegExp)
      }
      if (rule.toneLevel === 3) {
        expect(rule.toneBoundary.maximumLengthComparedWithTone).toBe(2)
      }
    }
  })

  it('말끝 및 완화 규칙 메타데이터 변조를 컴파일 단계에서 거절한다', () => {
    const brokenSpeechRules = templateRules.map((rule, index) =>
      index === 0
        ? {
            ...rule,
            speechBoundary: {
              description: '변조된 말끝 규칙',
              markerAtBoundary: /존재하지않는말끝/u,
            },
          }
        : rule,
    )
    expect(() => compileTemplateArtifact(templateFrames, brokenSpeechRules)).toThrowError(
      'violates speech-style boundary',
    )

    const brokenToneRules = templateRules.map((rule) =>
      rule.speechStyleId === 'seumnida' && rule.toneLevel === 2
        ? {
            ...rule,
            toneBoundary: {
              ...rule.toneBoundary,
              requiredSoftenerMarker: /존재하지않는완화표지/u,
            },
          }
        : rule,
    )
    expect(() => compileTemplateArtifact(templateFrames, brokenToneRules)).toThrowError(
      'violates tone boundary',
    )
  })

  it('핵심 화행 누락과 더 분명한 톤의 간결성 위반을 거절한다', () => {
    const first = templateFrames[0]
    if (!first) throw new Error('Expected a template frame fixture')
    const missingIntent: TemplateFrame = {
      ...first,
      realizations: {
        ...first.realizations,
        seumnida: {
          ...first.realizations.seumnida,
          1: { segments: [{ slot: 'coreIntent', text: '안녕하십니까?' }] },
        },
      },
    }
    expect(() => compileTemplateArtifact([missingIntent, ...templateFrames.slice(1)])).toThrowError(
      'violates intent boundary',
    )

    const nonConciseClearTone: TemplateFrame = {
      ...first,
      realizations: {
        ...first.realizations,
        seumnida: {
          ...first.realizations.seumnida,
          3: {
            segments: [
              {
                slot: 'coreIntent',
                text: `${first.realizations.seumnida[3].segments[0]?.text ?? ''} 가능한 시간을 다시 한 번 자세히 알려주실 수 있습니까?`,
              },
            ],
          },
        },
      },
    }
    expect(() =>
      compileTemplateArtifact([nonConciseClearTone, ...templateFrames.slice(1)]),
    ).toThrowError('violates tone boundary')
  })

  it('항상 같은 소문자 SHA-256 checksum과 같은 직렬화를 만든다', () => {
    const first = compileTemplateArtifact()
    const second = compileTemplateArtifact()

    expect(first).toEqual(second)
    expect(first.manifest.checksum).toMatch(/^[0-9a-f]{64}$/u)
    expect(first.manifest.checksum).toBe(checksumForCompiledTemplates(first.entries))
    expect({
      checksum: first.manifest.checksum,
      frameCount: first.manifest.frameCount,
      reviewStatus: first.manifest.reviewStatus,
      setCount: first.manifest.setCount,
      templateCount: first.manifest.templateCount,
      version: first.manifest.version,
    }).toMatchInlineSnapshot(`
      {
        "checksum": "4ac4ea33750c42164fac4b14d6b43071de122fccf3c5136868beb7ba6261c69f",
        "frameCount": 24,
        "reviewStatus": "approved",
        "setCount": 96,
        "templateCount": 288,
        "version": "t25-approved-2026-07-21.1",
      }
    `)
    expect(serializeTemplateArtifact(first)).toEqual(serializeTemplateArtifact(second))
    expect(first.manifest.entries).toHaveLength(288)
  })

  it('프레임 순서·필수 슬롯·빈 overrideReason 위반을 거절한다', () => {
    expect(() => compileTemplateArtifact([...templateFrames].reverse())).toThrowError(
      'Template frames must match the canonical scenario and situation order',
    )

    const first = templateFrames[0]
    if (!first) throw new Error('Expected a template frame fixture')
    const missingSlot: TemplateFrame = {
      ...first,
      realizations: {
        ...first.realizations,
        seumnida: {
          ...first.realizations.seumnida,
          1: { segments: [{ slot: 'greeting', text: '안녕하세요' }] },
        },
      },
    }
    expect(() => compileTemplateArtifact([missingSlot, ...templateFrames.slice(1)])).toThrowError(
      'is missing required slot coreIntent',
    )

    const emptyOverride: TemplateFrame = {
      ...first,
      realizations: {
        ...first.realizations,
        seumnida: {
          ...first.realizations.seumnida,
          1: { ...first.realizations.seumnida[1], overrideReason: '   ' },
        },
      },
    }
    expect(() => compileTemplateArtifact([emptyOverride, ...templateFrames.slice(1)])).toThrowError(
      'overrideReason must not be empty',
    )
  })

  it('Git 산출물이 현재 저작 소스 직렬화와 바이트 단위로 같다', () => {
    const expected = serializeTemplateArtifact(compileTemplateArtifact())
    expect(readFileSync(generatedTemplatesPath, 'utf8')).toBe(expected.templatesTypeScript)
    expect(readFileSync(generatedManifestPath, 'utf8')).toBe(expected.manifestJson)
  })
})
