import { writeFileSync } from 'node:fs'
import { config } from 'dotenv'
import { createEnvironmentGenerationProvider } from '../api/_lib/generation/geminiProvider'
import type { AiGenerationRequest } from '../api/_lib/generation/provider'
import { defaultSpeechStyleFor } from '../src/entities/message'
import type { GeneratedReply } from '../src/shared/generation/contracts'
import { evaluationCases, type EvaluationCase } from '../src/evaluation/generationCases'

config({ path: '.env.local', quiet: true })

const deadlineMs = 18_000
const maxOutputTokens = 1_024
const outputDir = 'harness/tasks/T21-holdout-quality'

type CaseResult =
  | { status: 'error'; message: string }
  | { status: 'ok'; reply: GeneratedReply }

const toAiGenerationRequest = (evaluationCase: EvaluationCase): AiGenerationRequest => {
  const base = {
    purpose: evaluationCase.purpose,
    route: 'manual_ai' as const,
    scenarioId: evaluationCase.scenarioId,
    speechStyleId: defaultSpeechStyleFor(evaluationCase.scenarioId),
    situation: evaluationCase.situation,
  }

  return evaluationCase.mode === 'reply'
    ? { ...base, mode: 'reply', receivedMessage: evaluationCase.receivedMessage ?? '' }
    : { ...base, mode: 'initiate' }
}

const shuffled = <Value>(values: readonly Value[]): Value[] => {
  const copy = [...values]
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]]
  }
  return copy
}

const runOne = async (
  provider: ReturnType<typeof createEnvironmentGenerationProvider>,
  evaluationCase: EvaluationCase,
): Promise<CaseResult> => {
  const request = toAiGenerationRequest(evaluationCase)

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const controller = new AbortController()
    const deadline = setTimeout(() => controller.abort(), deadlineMs)
    try {
      const output = await provider.generate(request, { maxOutputTokens, signal: controller.signal })
      clearTimeout(deadline)
      if (output && typeof output === 'object' && 'candidates' in output) {
        return { status: 'ok', reply: output as GeneratedReply }
      }
      if (attempt === 1) continue
      return { status: 'error', message: 'invalid_response (구조 검증 실패 또는 정상 완료 아님)' }
    } catch (error) {
      clearTimeout(deadline)
      const failure = error instanceof Error ? error.message : String(error)
      if (attempt === 1) continue
      return { status: 'error', message: failure }
    }
  }
  return { status: 'error', message: 'unreachable' }
}

const letters = ['A', 'B', 'C'] as const

const main = async () => {
  const provider = createEnvironmentGenerationProvider(process.env)

  const blindLines: string[] = ['# T21 holdout 블라인드 채점 패킷', '']
  const answerKey: Record<
    string,
    { situation: string; receivedMessage?: string; mapping: Record<string, number> } | { error: string }
  > = {}
  let successCount = 0

  for (const evaluationCase of evaluationCases) {
    process.stderr.write(`generating ${evaluationCase.id}...\n`)
    const result = await runOne(provider, evaluationCase)

    blindLines.push(`## ${evaluationCase.id} (${evaluationCase.relationship})`)
    if (evaluationCase.receivedMessage) {
      blindLines.push(`받은 메시지: ${evaluationCase.receivedMessage}`)
    }
    blindLines.push(`상황: ${evaluationCase.situation}`, '')

    if (result.status === 'error') {
      blindLines.push(`(생성 실패: ${result.message})`, '')
      answerKey[evaluationCase.id] = { error: result.message }
      continue
    }

    successCount += 1
    const order = shuffled(result.reply.candidates)
    const mapping: Record<string, number> = {}
    order.forEach((candidate, index) => {
      const letter = letters[index]
      mapping[letter] = candidate.toneLevel
      blindLines.push(`[${letter}] ${candidate.text}`)
    })
    blindLines.push('')

    answerKey[evaluationCase.id] = {
      situation: evaluationCase.situation,
      ...(evaluationCase.receivedMessage ? { receivedMessage: evaluationCase.receivedMessage } : {}),
      mapping,
    }
  }

  writeFileSync(`${outputDir}/blind-packet.md`, blindLines.join('\n'))
  writeFileSync(`${outputDir}/answer-key.json`, JSON.stringify(answerKey, null, 2))

  console.log(
    JSON.stringify({
      total: evaluationCases.length,
      success: successCount,
      failed: evaluationCases.length - successCount,
    }),
  )
}

await main()
