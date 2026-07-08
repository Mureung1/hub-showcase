// POST /api/gemini - OpenRouter(OpenAI 호환) chat/completions 프록시 (OPENROUTER_API_KEY는 서버에서만 사용)
import 'dotenv/config'
import express from 'express'

const PORT = process.env.PROXY_PORT || 8787
const MODEL = 'google/gemini-3-flash-preview'
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const APP_TITLE = 'CJMT'
const APP_REFERER = process.env.APP_URL || 'http://localhost:5173'

const RETRY_DELAYS_MS = [1000, 2000, 4000]
const RETRYABLE_STATUS = new Set([429, 503])

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchWithRetry(url, options) {
  let response = await fetch(url, options)

  for (const delay of RETRY_DELAYS_MS) {
    if (response.ok || !RETRYABLE_STATUS.has(response.status)) break
    await sleep(delay)
    response = await fetch(url, options)
  }

  return response
}

const app = express()
app.use(express.json({ limit: '15mb' }))

app.post('/api/gemini', async (req, res) => {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'OPENROUTER_API_KEY is not configured on the server' })
  }

  const { prompt, imageBase64, mimeType } = req.body || {}
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'prompt is required' })
  }

  const content = imageBase64
    ? [
        { type: 'text', text: prompt },
        { type: 'image_url', image_url: { url: `data:${mimeType || 'image/jpeg'};base64,${imageBase64}` } },
      ]
    : prompt

  try {
    const openRouterRes = await fetchWithRetry(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': APP_REFERER,
        'X-Title': APP_TITLE,
      },
      body: JSON.stringify({ model: MODEL, messages: [{ role: 'user', content }] }),
    })

    const data = await openRouterRes.json()

    if (!openRouterRes.ok) {
      console.error('OpenRouter API error:', data)
      return res.status(openRouterRes.status).json({ error: data?.error?.message || 'OpenRouter API error' })
    }

    const text = data?.choices?.[0]?.message?.content ?? ''
    res.json({ text })
  } catch (err) {
    console.error('OpenRouter proxy request failed:', err)
    res.status(500).json({ error: 'Internal proxy error' })
  }
})

app.listen(PORT, () => {
  console.log(`Gemini proxy server listening on http://localhost:${PORT}`)
})
