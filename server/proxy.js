// POST /api/gemini - Gemini generateContent REST 프록시 (GEMINI_API_KEY는 서버에서만 사용)
import 'dotenv/config'
import express from 'express'

const PORT = process.env.PROXY_PORT || 8787
const MODEL = 'gemini-2.5-flash'
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`

const app = express()
app.use(express.json({ limit: '15mb' }))

app.post('/api/gemini', async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server' })
  }

  const { prompt, imageBase64, mimeType } = req.body || {}
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'prompt is required' })
  }

  const parts = []
  if (imageBase64) {
    parts.push({
      inline_data: {
        mime_type: mimeType || 'image/jpeg',
        data: imageBase64,
      },
    })
  }
  parts.push({ text: prompt })

  try {
    const geminiRes = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({ contents: [{ parts }] }),
    })

    const data = await geminiRes.json()

    if (!geminiRes.ok) {
      console.error('Gemini API error:', data)
      return res.status(geminiRes.status).json({ error: data?.error?.message || 'Gemini API error' })
    }

    const text = (data?.candidates?.[0]?.content?.parts || [])
      .map((part) => part.text || '')
      .join('')

    res.json({ text })
  } catch (err) {
    console.error('Gemini proxy request failed:', err)
    res.status(500).json({ error: 'Internal proxy error' })
  }
})

app.listen(PORT, () => {
  console.log(`Gemini proxy server listening on http://localhost:${PORT}`)
})
