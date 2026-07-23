import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import { purposes, scenarios, type Mode } from '../src/entities/message/index.js'
import type { ReviewedPromptExampleSet } from '../api/_lib/prompt/examples.js'
import { reviewedPromptExampleCatalog } from '../api/_lib/prompt/seedExamples.js'
import { retrievalCoverageCandidateDraft } from '../api/_lib/retrieval/coverageCandidateDraft.js'

const reviewDirectory = resolve('harness/tasks/T35-retrieval-experiment')
const packetPath = resolve(reviewDirectory, 'coverage-corpus-blind-review.md')
const answerKeyPath = resolve(reviewDirectory, 'coverage-corpus-blind-answer-key.json')
const candidateLabels = ['가', '나', '다'] as const
const modes = ['reply', 'initiate'] as const satisfies readonly Mode[]
const permutations = [
  [1, 0, 2],
  [2, 1, 0],
  [0, 2, 1],
  [2, 0, 1],
  [1, 2, 0],
  [0, 1, 2],
] as const

type CandidateLabel = (typeof candidateLabels)[number]
type ReviewSourceStatus = 'approved-existing' | 'draft-new'

type ReviewSet = {
  readonly example: ReviewedPromptExampleSet
  readonly reviewSetId: string
  readonly sourceStatus: ReviewSourceStatus
}

type AnswerKeyEntry = {
  readonly candidateToneLevels: Readonly<Record<CandidateLabel, 1 | 2 | 3>>
  readonly exampleId: string
  readonly reviewSetId: string
  readonly sourceStatus: ReviewSourceStatus
}

const scenarioOrder = new Map(scenarios.map((scenario, index) => [scenario.id, index] as const))
const purposeOrder = new Map(purposes.map((purpose, index) => [purpose.id, index] as const))
const modeOrder = new Map(modes.map((mode, index) => [mode, index] as const))

const orderedExamples = [
  ...reviewedPromptExampleCatalog,
  ...retrievalCoverageCandidateDraft,
].sort((left, right) => {
  const scenarioDifference =
    (scenarioOrder.get(left.scenarioId) ?? 0) - (scenarioOrder.get(right.scenarioId) ?? 0)
  if (scenarioDifference !== 0) return scenarioDifference
  const purposeDifference =
    (purposeOrder.get(left.purpose) ?? 0) - (purposeOrder.get(right.purpose) ?? 0)
  if (purposeDifference !== 0) return purposeDifference
  const modeDifference = (modeOrder.get(left.mode) ?? 0) - (modeOrder.get(right.mode) ?? 0)
  if (modeDifference !== 0) return modeDifference
  return left.exampleId.localeCompare(right.exampleId)
})

const reviewSets: readonly ReviewSet[] = orderedExamples.map((example, index) => ({
  example,
  reviewSetId: `R${String(index + 1).padStart(3, '0')}`,
  sourceStatus: 'reviewStatus' in example ? 'draft-new' : 'approved-existing',
}))

const scenarioNameFor = (scenarioId: ReviewedPromptExampleSet['scenarioId']) =>
  scenarios.find((scenario) => scenario.id === scenarioId)?.name ?? scenarioId

const purposeNameFor = (purposeId: ReviewedPromptExampleSet['purpose']) =>
  purposes.find((purpose) => purpose.id === purposeId)?.label ?? purposeId

const modeNameFor = (mode: Mode) => (mode === 'reply' ? '답장' : '먼저 보내기')

const orderedCandidatesFor = (reviewSet: ReviewSet) => {
  const numericId = Number(reviewSet.reviewSetId.slice(1))
  const permutation = permutations[(numericId - 1) % permutations.length] ?? permutations[0]
  return candidateLabels.map((label, labelIndex) => {
    const candidateIndex = permutation[labelIndex] ?? 0
    const candidate = reviewSet.example.candidates[candidateIndex]
    if (!candidate) throw new Error(`Candidate missing for ${reviewSet.reviewSetId}`)
    return { candidate, label }
  })
}

export const renderCoverageBlindReviewPacket = () => {
  const sections = reviewSets.map((reviewSet) => {
    const { example } = reviewSet
    const candidateSections = orderedCandidatesFor(reviewSet)
      .map(
        ({ candidate, label }) =>
          `### 후보 ${label}\n\n${candidate.text}\n\n- 전송 가능성: [ ] 예  [ ] 아니오\n- 아니오라면 이유: `,
      )
      .join('\n\n')

    return `## ${reviewSet.reviewSetId}\n\n- 관계: ${scenarioNameFor(example.scenarioId)}\n- 목적: ${purposeNameFor(example.purpose)}\n- 방식: ${modeNameFor(example.mode)}\n- 상황: ${example.situation}\n${example.receivedMessage ? `- 받은 메시지: ${example.receivedMessage}\n` : ''}\n${candidateSections}\n\n- 부드러운 순서 \u2014 더 부드럽게 → 기본 → 더 분명하게: ____ → ____ → ____\n- 세 후보의 사실·핵심 화행이 같은가: [ ] 예  [ ] 아니오\n- 관계와 말투가 자연스러운가: [ ] 예  [ ] 아니오\n- 세트 메모: `
  })

  return `# T35 retrieval coverage corpus 블라인드 검수지\n\n> 상태: 제3자 검수 대기\n>\n> 범위: 96세트·288후보 전수\n>\n> 작성자·모델·기존 검수 여부·세부 톤 라벨은 검수자에게 공개하지 않는다.\n\n## 검수 방법\n\n1. 각 세트의 후보 가·나·다를 읽고 **더 부드럽게 → 기본 → 더 분명하게** 순서로 정렬한다.\n2. 후보마다 “지금 이 상황이라면 이대로 보낼 수 있는가”를 예/아니오로 판정한다.\n3. 세 후보가 같은 사실과 핵심 화행을 유지하는지 확인한다.\n4. 관계와 말투가 자연스러운지 확인한다.\n5. 하나라도 아니오이면 이유를 적는다. 작성자는 정답표와 대조해 불일치 세트를 재작성한다.\n\n${sections.join('\n\n---\n\n')}\n`
}

export const renderCoverageBlindAnswerKey = () => {
  const entries: readonly AnswerKeyEntry[] = reviewSets.map((reviewSet) => {
    const candidates = orderedCandidatesFor(reviewSet)
    const toneLevels = Object.fromEntries(
      candidates.map(({ candidate, label }) => [label, candidate.toneLevel]),
    ) as Record<CandidateLabel, 1 | 2 | 3>

    return {
      candidateToneLevels: toneLevels,
      exampleId: reviewSet.example.exampleId,
      reviewSetId: reviewSet.reviewSetId,
      sourceStatus: reviewSet.sourceStatus,
    }
  })

  return `${JSON.stringify(
    {
      catalogVersion: 'retrieval-coverage-review-2026-07-22.1',
      instructions: '검수 완료 전까지 검수자에게 공개하지 않는다.',
      setCount: entries.length,
      candidateCount: entries.length * 3,
      entries,
    },
    null,
    2,
  )}\n`
}

const artifacts = [
  { content: renderCoverageBlindReviewPacket(), path: packetPath },
  { content: renderCoverageBlindAnswerKey(), path: answerKeyPath },
] as const

const writeArtifacts = () => {
  artifacts.forEach((artifact) => writeFileSync(artifact.path, artifact.content, 'utf8'))
  process.stdout.write('T35 coverage blind review artifacts generated: 96 sets / 288 candidates\n')
}

const checkArtifacts = () => {
  artifacts.forEach((artifact) => {
    let actual: string
    try {
      actual = readFileSync(artifact.path, 'utf8')
    } catch {
      throw new Error(`Missing generated review artifact: ${artifact.path}`)
    }
    if (actual !== artifact.content) {
      throw new Error(`Generated review artifact is stale: ${artifact.path}`)
    }
  })
  process.stdout.write('T35 coverage blind review artifacts are current: 96 sets / 288 candidates\n')
}

const currentFile = fileURLToPath(import.meta.url)
const invokedFile = process.argv[1] ? resolve(process.argv[1]) : ''

if (invokedFile === currentFile) {
  if (process.argv.includes('--write')) writeArtifacts()
  else if (process.argv.includes('--check')) checkArtifacts()
  else throw new Error('Use --write or --check')
}
