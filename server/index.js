import 'dotenv/config'
import express from 'express'
import cors from 'cors'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const GEMINI_MODEL = 'gemini-2.5-flash'
const PORT = process.env.PORT || 3001

const app = express()
app.use(cors())
app.use(express.json())

app.post('/api/ask', async (req, res) => {
  const { question, context } = req.body ?? {}

  if (!question || !context) {
    return res.status(400).json({ error: '질문과 화면 컨텍스트가 모두 필요해요.' })
  }

  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: 'AI 질문 기능을 잠시 이용할 수 없습니다.' })
  }

  const prompt = `당신은 "전공별 시각화 학습 플랫폼"의 학습 도우미입니다. 사용자가 지금 보고 있는 화면 상태를 참고해서, 아래 질문에 한국어로 간결하게 답해주세요.

[현재 화면 상태]
${context}

[질문]
${question}`

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      },
    )

    if (!response.ok) {
      const errBody = await response.json().catch(() => null)
      console.error('Gemini API error:', response.status, errBody)
      return res.status(502).json({ error: '잠시 후 다시 시도해주세요.' })
    }

    const data = await response.json()
    const answer = data.candidates?.[0]?.content?.parts?.[0]?.text

    if (!answer) {
      console.error('Gemini API returned no answer:', JSON.stringify(data))
      return res.status(502).json({ error: 'AI 답변을 받지 못했어요.' })
    }

    res.json({ answer })
  } catch (err) {
    console.error('Gemini proxy error:', err)
    res.status(500).json({ error: '서버 오류가 발생했어요.' })
  }
})

app.listen(PORT, () => {
  console.log(`Gemini proxy listening on http://localhost:${PORT}`)
})
