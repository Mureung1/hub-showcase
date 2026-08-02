import { GoogleGenAI } from '@google/genai'
import { createTravelContext } from '../server/mapService.js'

const model = process.env.GEMINI_MODEL

const analysisSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'overallScore',
    'decision',
    'summary',
    'categoryScores',
    'priceAnalysis',
    'maintenanceFeeAnalysis',
    'commuteAnalysis',
    'transportationCostAnalysis',
    'convenienceAnalysis',
    'reliabilityAnalysis',
    'termExplanations',
    'risks',
    'checklist',
    'nextQuestions',
  ],
  properties: {
    overallScore: {
      type: 'number',
      minimum: 0,
      maximum: 100,
    },
    decision: {
      type: 'string',
      enum: ['추천', '조건부추천', '비추천'],
    },
    summary: { type: 'string' },
    categoryScores: {
      type: 'object',
      additionalProperties: false,
      required: ['area', 'cost', 'living', 'preference', 'safety', 'transport'],
      properties: {
        area: { type: 'number', minimum: 0, maximum: 100 },
        cost: { type: 'number', minimum: 0, maximum: 100 },
        living: { type: 'number', minimum: 0, maximum: 100 },
        preference: { type: 'number', minimum: 0, maximum: 100 },
        safety: { type: 'number', minimum: 0, maximum: 100 },
        transport: { type: 'number', minimum: 0, maximum: 100 },
      },
    },
    priceAnalysis: { type: 'string' },
    maintenanceFeeAnalysis: { type: 'string' },
    commuteAnalysis: { type: 'string' },
    transportationCostAnalysis: { type: 'string' },
    convenienceAnalysis: { type: 'string' },
    reliabilityAnalysis: { type: 'string' },
    termExplanations: {
      type: 'array',
      items: { type: 'string' },
    },
    risks: {
      type: 'array',
      items: { type: 'string' },
    },
    checklist: {
      type: 'array',
      items: { type: 'string' },
    },
    nextQuestions: {
      type: 'array',
      items: { type: 'string' },
    },
  },
}

function validateAnalyzeRequest(body) {
  if (!body || typeof body !== 'object') {
    return '요청 본문이 필요합니다.'
  }

  if (!body.userInfo || typeof body.userInfo !== 'object') {
    return '사용자 정보가 필요합니다.'
  }

  if (!body.listingInfo || typeof body.listingInfo !== 'object') {
    return '매물 정보가 필요합니다.'
  }

  if (!body.listingInfo.fields || typeof body.listingInfo.fields !== 'object') {
    return '매물 입력 필드가 필요합니다.'
  }

  return ''
}

const systemInstruction =
  '너는 대학생 첫 자취방 의사결정을 돕는 한국어 분석 도우미다. 부동산 계약의 최종 법률 판단을 대신하지 말고, 사용자가 확인해야 할 가격, 관리비, 통학, 교통비, 생활 편의성, 매물 신뢰도, 용어 이해 관점을 실용적으로 정리한다. 매물 유형, 거래 유형, 공급/전용면적, 층수, 방수/욕실수, 사용승인일, 방향, 주차, 건축물 용도, 매물번호, 확인매물 날짜가 있으면 분석에 적극 반영한다. categoryScores는 면적, 주거비용, 주거환경, 사용자 선호, 안전/신뢰, 통학 항목을 각각 0~100점으로 평가한다. 확실하지 않은 내용은 단정하지 말고 확인 필요로 표현한다.'

function createPrompt({ listingInfo, userInfo }) {
  return JSON.stringify(
    {
      task: '사용자 정보와 매물 OCR/입력 정보를 바탕으로 자취방 의사결정 참고 분석을 구조화해서 작성해줘. 가격과 관리비는 사용자의 예산 조건과 비교하고, 통학 조건은 지도 API 계산 결과, 주당 등교 횟수, 최대 이동 시간, 선호 교통수단을 함께 고려해줘. 생활 편의성은 OCR/입력 정보에 근거가 부족하면 확인 필요로 표현해줘. 지도 API 계산 결과가 unavailable 또는 partial이면 그 한계를 명확히 말하고 단정하지 마.',
      userInfo,
      listingInfo,
    },
    null,
    2,
  )
}

function readGeneratedText(result) {
  if (!result.text) {
    throw new Error('Gemini 응답 본문이 비어 있습니다.')
  }

  return result.text
}

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST')
    response.status(405).json({ error: 'Method Not Allowed' })
    return
  }

  const validationError = validateAnalyzeRequest(request.body)
  if (validationError) {
    response.status(400).json({ error: validationError })
    return
  }

  if (!process.env.GEMINI_API_KEY) {
    response.status(500).json({ error: 'GEMINI_API_KEY가 설정되어 있지 않습니다.' })
    return
  }

  if (!model) {
    response.status(500).json({ error: 'GEMINI_MODEL이 설정되어 있지 않습니다.' })
    return
  }

  try {
    const travelContext = await createTravelContext(request.body)
    const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
    const result = await client.models.generateContent({
      model,
      contents: createPrompt({
        ...request.body,
        listingInfo: {
          ...request.body.listingInfo,
          travelContext,
        },
      }),
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseJsonSchema: analysisSchema,
      },
    })

    response.status(200).json({
      analysis: {
        ...JSON.parse(readGeneratedText(result)),
        travelContext,
      },
    })
  } catch (error) {
    const status = error?.status || 500
    console.error('[analyze-listing] failed', {
      status,
      message: error?.message,
      name: error?.name,
    })

    const message = status === 401
      ? 'Gemini API 인증에 실패했습니다.'
      : error instanceof SyntaxError
        ? 'AI 분석 응답 형식이 올바르지 않습니다.'
        : '분석 API 호출 중 오류가 발생했습니다.'

    response.status(status).json({ error: message })
  }
}
