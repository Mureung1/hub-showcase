import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import { GoogleGenAI } from '@google/genai'

dotenv.config()

const app = express()
const port = Number(process.env.PORT || 8787)
const model = process.env.GEMINI_MODEL

app.use(cors({ origin: true }))
app.use(express.json({ limit: '1mb' }))

const analysisSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'overallScore',
    'decision',
    'summary',
    'costAnalysis',
    'commuteAnalysis',
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
      enum: ['추천', '주의', '비추천'],
    },
    summary: { type: 'string' },
    costAnalysis: { type: 'string' },
    commuteAnalysis: { type: 'string' },
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
  '너는 대학생 첫 자취방 의사결정을 돕는 한국어 분석 도우미다. 부동산 계약의 최종 법률 판단을 대신하지 말고, 사용자가 확인해야 할 비용, 통학, 매물 신뢰도, 용어 이해 관점을 실용적으로 정리한다. 확실하지 않은 내용은 단정하지 말고 확인 필요로 표현한다.'

function createPrompt({ listingInfo, userInfo }) {
  return JSON.stringify(
    {
      task: '사용자 정보와 매물 OCR/입력 정보를 바탕으로 자취방 의사결정 참고 분석을 구조화해서 작성해줘.',
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

app.get('/api/health', (request, response) => {
  response.json({ ok: true })
})

app.post('/api/analyze-listing', async (request, response) => {
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
    const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
    const result = await client.models.generateContent({
      model,
      contents: createPrompt(request.body),
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseJsonSchema: analysisSchema,
      },
    })

    response.json({ analysis: JSON.parse(readGeneratedText(result)) })
  } catch (error) {
    const status = error?.status || 500
    const message = status === 401
      ? 'Gemini API 인증에 실패했습니다.'
      : '분석 API 호출 중 오류가 발생했습니다.'

    response.status(status).json({ error: message })
  }
})

app.listen(port, () => {
  console.log(`Analysis API server listening on http://localhost:${port}`)
})
