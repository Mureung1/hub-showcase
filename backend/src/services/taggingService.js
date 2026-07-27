// 편지 태깅(감정·키워드·요약·위기신호) 처리. 이 파일이 Letter의 태깅 관련 컬럼을 갱신하는
// 유일한 통로다. tagLetter는 절대 throw하지 않는다 — 무슨 일이 있어도 편지 자체는 이미
// 저장돼 있으므로, 태깅이 어떻게 실패하든 taggingStatus를 'failed'로 남기고 조용히 끝낸다.
import { prisma } from '../lib/prisma.js'
import { callAiModel } from '../lib/aiClient.js'
import { buildTagPrompt, TAG_PROMPT_VERSION } from '../prompts/tagPrompt.js'
import { buildEmotionAdjacencyPrompt } from '../prompts/emotionAdjacencyPrompt.js'
import { validateTagResponse, validateEmotionAdjacencyResponse } from '../lib/tagValidation.js'
import { normalizeKeywords } from '../lib/keywordNormalize.js'
import { SYNONYMS, GEMINI_MODEL, AI_MOCK } from '../config/matchingConfig.js'
import { EMOTIONS, isValidEmotion, addDynamicEmotion } from '../config/emotions.js'

const REPRESENTATIVE_KEYWORDS = Object.keys(SYNONYMS)
// taggingModel에 실제로 어떤 경로로 태깅됐는지 정확히 남긴다 — mock인데 GEMINI_MODEL 이름이
// 찍히면, 나중에 "이거 진짜 Gemini가 분석한 결과인가?"를 착각하게 만드는 원인이 된다.
const RESOLVED_MODEL_NAME = AI_MOCK ? 'mock' : GEMINI_MODEL

async function runTaggingAttempt(letterBody) {
  const { system, user } = buildTagPrompt({
    letterBody,
    representativeKeywords: REPRESENTATIVE_KEYWORDS,
  })
  const response = await callAiModel({ purpose: 'tag', system, user })
  return { response, validation: validateTagResponse(response) }
}

// response에서 "현재 감정 어휘에 없는" 감정 단어만 골라, Gemini에게 어디와 가까운지 물어서
// 어휘·인접 관계에 새로 추가한다. 태깅이 실패했을 때(=validateTagResponse가 걸러냈을 때)만
// 호출되는 함수다 — 성공한 태깅 결과에서는 절대 호출하지 않는다.
async function learnUnknownEmotions(response) {
  const candidates = [response?.primary_emotion, ...(Array.isArray(response?.secondary_emotions) ? response.secondary_emotions : [])]
  const unknownEmotions = [
    ...new Set(candidates.filter((emotion) => typeof emotion === 'string' && emotion.trim() !== '' && !isValidEmotion(emotion))),
  ]

  for (const emotion of unknownEmotions) {
    if (isValidEmotion(emotion)) continue // 앞선 루프에서 이미 학습된 경우(중복 단어) 건너뜀

    // 물어보는 시점의 "현재" 목록을 넘긴다 — EMOTIONS는 학습될 때마다 늘어나는 배열이라
    // 여기서 값을 복사해두지 않고 매번 최신 상태를 그대로 참조한다.
    const { system, user } = buildEmotionAdjacencyPrompt({ newEmotion: emotion, existingEmotions: EMOTIONS })

    let adjacentTo = []
    try {
      const adjacencyResponse = await callAiModel({ purpose: 'emotionAdjacency', system, user })
      adjacentTo = validateEmotionAdjacencyResponse(adjacencyResponse, EMOTIONS)
    } catch {
      adjacentTo = [] // 분류 호출이 실패해도 고립 상태로라도 어휘에 추가하고 태깅은 계속 진행한다
    }

    addDynamicEmotion(emotion, adjacentTo)
  }

  return unknownEmotions.length > 0
}

// 태깅을 한 번 시도하고, 실패 원인이 "목록에 없는 감정"이면 그 감정을 학습시킨 뒤
// 같은 응답을 다시 검증한다(Gemini를 다시 부르지 않음 — 이미 받은 응답을 재검증만 함).
async function attemptTaggingWithLearning(letterBody) {
  let { response, validation } = await runTaggingAttempt(letterBody)

  if (!validation.valid) {
    const learnedSomething = await learnUnknownEmotions(response)
    if (learnedSomething) validation = validateTagResponse(response)
  }

  return { response, validation }
}

async function markDone(letterId, response) {
  await prisma.letter.update({
    where: { id: letterId },
    data: {
      primaryEmotion: response.primary_emotion,
      secondaryEmotions: response.secondary_emotions,
      keywordsRaw: response.keywords,
      keywordsNorm: normalizeKeywords(response.keywords),
      summary: response.summary,
      riskFlag: response.risk_flag,
      isMatchable: !response.risk_flag,
      taggingRaw: response,
      taggingModel: RESOLVED_MODEL_NAME,
      taggingPromptVersion: TAG_PROMPT_VERSION,
      taggingStatus: 'done',
      taggingAttempts: { increment: 1 },
      taggingError: null,
    },
  })
}

async function markFailed(letterId, rawResponse, errorMessage) {
  await prisma.letter.update({
    where: { id: letterId },
    data: {
      ...(rawResponse ? { taggingRaw: rawResponse } : {}),
      taggingModel: RESOLVED_MODEL_NAME,
      taggingPromptVersion: TAG_PROMPT_VERSION,
      taggingStatus: 'failed',
      taggingAttempts: { increment: 1 },
      taggingError: errorMessage.slice(0, 500),
    },
  })
}

export async function tagLetter(letterId) {
  const letter = await prisma.letter.findUnique({ where: { id: letterId } })
  if (!letter) return

  try {
    let { response, validation } = await attemptTaggingWithLearning(letter.content)
    if (!validation.valid) {
      ;({ response, validation } = await attemptTaggingWithLearning(letter.content))
    }

    if (!validation.valid) {
      await markFailed(letterId, response, validation.errors.join('; '))
      return
    }

    await markDone(letterId, response)
  } catch (err) {
    await markFailed(letterId, null, err.message)
  }
}

// 실패/정체된 편지 재처리용. tagLetter는 같은 행을 update만 하므로 여러 번 호출해도 안전(멱등)하다.
export async function reprocessTagging(letterId) {
  return tagLetter(letterId)
}
