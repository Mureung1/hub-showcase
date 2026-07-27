// 모든 AI(Gemini) 호출이 거쳐가는 단일 초크포인트.
// 목 모드 지원, 토큰/모델 로깅(편지 본문은 절대 로깅하지 않음), 동시성 세마포어,
// 일일 호출 한도(Gemini 무료 티어 보호) 가드를 담당한다.
// 벤더를 나중에 또 바꿀 가능성을 고려해 이름·인터페이스를 벤더 중립적으로 유지한다.
import { AI_MOCK, GEMINI_MODEL, DAILY_CALL_CAP, MAX_CONCURRENT_AI_CALLS } from '../config/matchingConfig.js'

export class CostCapError extends Error {
  constructor(message) {
    super(message)
    this.name = 'CostCapError'
  }
}

// --- 일일 호출 카운터 ---
// 프로세스 메모리에만 있는 카운터라 서버 재시작 시 리셋된다.
// 여러 인스턴스로 배포하게 되면 DB나 Redis 기반 카운터로 교체해야 한다.
let callCountToday = 0
let countResetAt = startOfNextDay()

function startOfNextDay() {
  const d = new Date()
  d.setHours(24, 0, 0, 0)
  return d.getTime()
}

function checkDailyCap() {
  if (Date.now() >= countResetAt) {
    callCountToday = 0
    countResetAt = startOfNextDay()
  }
  if (callCountToday >= DAILY_CALL_CAP) {
    throw new CostCapError('일일 AI 호출 한도를 초과했어요.')
  }
  callCountToday += 1
}

// --- 동시성 세마포어 ---
let activeCalls = 0
const waitQueue = []

async function acquireSlot() {
  if (activeCalls < MAX_CONCURRENT_AI_CALLS) {
    activeCalls += 1
    return
  }
  await new Promise((resolve) => waitQueue.push(resolve))
  activeCalls += 1
}

function releaseSlot() {
  activeCalls -= 1
  const next = waitQueue.shift()
  if (next) next()
}

function logCall({ purpose, model, inputTokens, outputTokens }) {
  console.log(
    `[aiClient] purpose=${purpose} model=${model} inputTokens=${inputTokens} outputTokens=${outputTokens}`,
  )
}

// 정확한 토크나이저가 아니라 로깅/가드용 근사치(글자 수 ÷ 4)다.
function estimateTokens(text) {
  return Math.ceil((text?.length ?? 0) / 4)
}

function stripCodeFence(text) {
  return text.trim().replace(/^```(json)?/, '').replace(/```$/, '').trim()
}

const MOCK_RESPONSES = {
  tag: {
    primary_emotion: '불안',
    secondary_emotions: ['막막함', '두려움'],
    keywords: ['취업준비', '면접', '자기소개서'],
    summary: '취업 준비 중 불안하고 막막한 상황을 담은 편지예요.',
    risk_flag: false,
  },
  select: {
    // selected_id는 실제 후보 목록이 없는 목 모드라 비워두고, 호출하는 쪽에서 필요시 덮어쓴다.
    selected_id: null,
    reason: '두 분 모두 비슷한 감정의 결을 지나고 계신 것 같아요. (mock 응답)',
  },
  emotionAdjacency: {
    adjacent_to: [],
  },
}

async function callMock({ purpose, user }) {
  const response = MOCK_RESPONSES[purpose]
  if (!response) {
    throw new Error(`알 수 없는 purpose: ${purpose}`)
  }
  logCall({
    purpose,
    model: 'mock',
    inputTokens: estimateTokens(user),
    outputTokens: estimateTokens(JSON.stringify(response)),
  })
  return response
}

// Gemini 무료 티어의 429(RESOURCE_EXHAUSTED, 분당 요청 한도) 응답에서 "몇 초 뒤 재시도하라"는
// 힌트를 뽑아낸다. 못 찾으면 null(재시도 대상 아님으로 취급).
function parseRetryDelaySeconds(message) {
  try {
    const parsed = JSON.parse(message)
    const retryInfo = parsed?.error?.details?.find((d) => d['@type']?.includes('RetryInfo'))
    if (retryInfo?.retryDelay) {
      const seconds = Number.parseFloat(retryInfo.retryDelay.replace('s', ''))
      if (!Number.isNaN(seconds)) return seconds
    }
    if (parsed?.error?.code === 429) return 5 // 힌트가 없으면 기본 5초 대기
  } catch {
    // JSON이 아닌 에러면 재시도 대상 아님
  }
  return null
}

async function callGeminiOnce({ system, user }) {
  const { GoogleGenAI } = await import('@google/genai')
  const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  return client.models.generateContent({
    model: GEMINI_MODEL,
    contents: user,
    config: {
      systemInstruction: system,
      responseMimeType: 'application/json',
    },
  })
}

// 실제 Gemini 호출 경로. @google/genai@2.13.0의 타입 정의(genai.d.ts) 기준으로 확인함:
// models.generateContent, result.text, usageMetadata.promptTokenCount/candidatesTokenCount,
// config.systemInstruction/responseMimeType 전부 존재. contents는 PartUnion = Part | string이라
// 그냥 문자열로 넘겨도 된다.
async function callGemini({ purpose, system, user }) {
  let result
  try {
    result = await callGeminiOnce({ system, user })
  } catch (err) {
    // 무료 티어 분당 요청 한도(429)는 배치 재처리·시드 스크립트에서 흔히 부딪힌다.
    // 서버가 알려준 시간만큼 기다렸다가 한 번만 재시도한다(그 외 에러는 그대로 올려보냄).
    const retryDelaySeconds = parseRetryDelaySeconds(err.message)
    if (retryDelaySeconds == null) throw err
    await new Promise((resolve) => setTimeout(resolve, (retryDelaySeconds + 1) * 1000))
    result = await callGeminiOnce({ system, user })
  }

  const text = result.text
  const usage = result.usageMetadata ?? {}
  logCall({
    purpose,
    model: GEMINI_MODEL,
    inputTokens: usage.promptTokenCount ?? estimateTokens(user),
    outputTokens: usage.candidatesTokenCount ?? estimateTokens(text),
  })

  return JSON.parse(stripCodeFence(text))
}

// purpose: 'tag' | 'select' | 'emotionAdjacency'
export async function callAiModel({ purpose, system, user }) {
  checkDailyCap()
  await acquireSlot()
  try {
    return AI_MOCK ? await callMock({ purpose, system, user }) : await callGemini({ purpose, system, user })
  } finally {
    releaseSlot()
  }
}
