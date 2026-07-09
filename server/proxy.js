// POST /api/gemini - OpenRouter(OpenAI 호환) chat/completions 프록시 (OPENROUTER_API_KEY는 서버에서만 사용)
import 'dotenv/config'
import express from 'express'

const PORT = process.env.PROXY_PORT || 8787
const MODEL = 'google/gemini-3-flash-preview'
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const APP_TITLE = 'CJMT'
const APP_REFERER = process.env.APP_URL || 'http://localhost:5173'
const KAKAO_KEYWORD_SEARCH_URL = 'https://dapi.kakao.com/v2/local/search/keyword.json'
const FOODSAFETY_URL = 'https://api.data.go.kr/openapi/tn_pubr_public_nutri_food_info_api'

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

  const { prompt, system, imageBase64, mimeType } = req.body || {}
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'prompt is required' })
  }

  const content = imageBase64
    ? [
        { type: 'text', text: prompt },
        { type: 'image_url', image_url: { url: `data:${mimeType || 'image/jpeg'};base64,${imageBase64}` } },
      ]
    : prompt

  const messages = []
  if (system && typeof system === 'string') {
    messages.push({ role: 'system', content: system })
  }
  messages.push({ role: 'user', content })

  try {
    const openRouterRes = await fetchWithRetry(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': APP_REFERER,
        'X-Title': APP_TITLE,
      },
      body: JSON.stringify({ model: MODEL, messages }),
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

// POST /api/places - 카카오 키워드 장소 검색 프록시 (KAKAO_REST_API_KEY는 서버에서만 사용)
app.post('/api/places', async (req, res) => {
  const apiKey = process.env.KAKAO_REST_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'KAKAO_REST_API_KEY is not configured on the server' })
  }

  const { x, y, keyword, radius = 3000 } = req.body || {}
  if (!x || !y || !keyword || typeof keyword !== 'string') {
    return res.status(400).json({ error: 'x, y, keyword are required' })
  }

  const url = new URL(KAKAO_KEYWORD_SEARCH_URL)
  url.searchParams.set('query', keyword)
  url.searchParams.set('x', x)
  url.searchParams.set('y', y)
  url.searchParams.set('radius', radius)
  url.searchParams.set('sort', 'distance')
  url.searchParams.set('size', '5')

  try {
    const kakaoRes = await fetch(url, {
      headers: { Authorization: `KakaoAK ${apiKey}` },
    })

    const data = await kakaoRes.json()

    if (!kakaoRes.ok) {
      console.error('Kakao API error:', data)
      return res.status(kakaoRes.status).json({ error: data?.message || 'Kakao API error' })
    }

    const places = (data?.documents || []).map((doc) => ({
      place_name: doc.place_name,
      road_address_name: doc.road_address_name || doc.address_name,
      distance: doc.distance,
      phone: doc.phone,
      place_url: doc.place_url,
      category_name: doc.category_name,
      x: doc.x,
      y: doc.y,
    }))

    res.json(places)
  } catch (err) {
    console.error('Kakao proxy request failed:', err)
    res.status(500).json({ error: 'Internal proxy error' })
  }
})

function toNumber(v) {
  if (v === undefined || v === null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

// "100g" -> { value: 100, unit: 'g', raw: '100g' }
function parseBaseQuantity(raw) {
  if (typeof raw !== 'string' || !raw.trim()) return null
  const match = raw.trim().match(/^([\d.]+)\s*(.*)$/)
  if (!match) return { value: null, unit: null, raw }
  return { value: toNumber(match[1]), unit: match[2] || null, raw }
}

function normalizeFoodItem(item) {
  return {
    name: item?.foodNm ?? null,
    baseQuantity: parseBaseQuantity(item?.nutConSrtrQua),
    nutrients: {
      calories: toNumber(item?.enerc),
      protein: toNumber(item?.prot),
      fat: toNumber(item?.fatce),
      carbs: toNumber(item?.chocdf),
      fiber: toNumber(item?.fibtg),
      sodium: toNumber(item?.nat),
    },
  }
}

// 공공데이터포털 응답의 items 위치는 API마다 배열/{item:[]}/{item:{}}로 제각각이라 방어적으로 처리
function extractFoodItems(data) {
  const items = data?.response?.body?.items
  if (Array.isArray(items)) return items
  if (Array.isArray(items?.item)) return items.item
  if (items?.item && typeof items.item === 'object') return [items.item]
  return null
}

const AUTH_ERROR_HINT = /SERVICE_KEY|SERVICE ERROR|INVALID_REQUEST_PARAMETER/i

function isAuthError(data) {
  const msg = data?.response?.header?.resultMsg
  return typeof msg === 'string' && AUTH_ERROR_HINT.test(msg)
}

// rawKey=false: Decoding 키로 가정, URLSearchParams가 한 번만 인코딩하도록 맡긴다.
// rawKey=true: Encoding 키(이미 퍼센트 인코딩됨)로 가정, URLSearchParams를 거치면 이중 인코딩되므로 직접 붙인다.
function buildFoodSafetyUrl(apiKey, foodName, rawKey) {
  const params = new URLSearchParams({ pageNo: '1', numOfRows: '10', type: 'json', foodNm: foodName })
  if (rawKey) {
    return `${FOODSAFETY_URL}?serviceKey=${apiKey}&${params.toString()}`
  }
  params.set('serviceKey', apiKey)
  return `${FOODSAFETY_URL}?${params.toString()}`
}

async function callFoodSafetyApi(apiKey, foodName, rawKey) {
  const url = buildFoodSafetyUrl(apiKey, foodName, rawKey)
  const upstreamRes = await fetch(url)
  const raw = await upstreamRes.text()
  let data = null
  try {
    data = JSON.parse(raw)
  } catch {
    data = null
  }
  return { upstreamRes, raw, data }
}

// POST /api/fooddb - 식약처 전국통합식품영양성분정보(음식) 검색 프록시 (FOODSAFETY_API_KEY는 서버에서만 사용)
app.post('/api/fooddb', async (req, res) => {
  const apiKey = process.env.FOODSAFETY_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'FOODSAFETY_API_KEY is not configured on the server' })
  }

  const { foodName } = req.body || {}
  if (!foodName || typeof foodName !== 'string' || !foodName.trim()) {
    return res.status(400).json({ error: 'foodName is required' })
  }

  try {
    let { upstreamRes, raw, data } = await callFoodSafetyApi(apiKey, foodName, false)

    // JSON 파싱 실패(보통 서비스키 인증 오류 시 XML로 응답) 또는 인증 오류 메시지면 반대 방식(raw key)으로 재시도
    if (!data || isAuthError(data)) {
      ;({ upstreamRes, raw, data } = await callFoodSafetyApi(apiKey, foodName, true))
    }

    if (!data) {
      console.error('FoodSafety API: JSON 파싱 실패, 원본 응답 일부:', raw.slice(0, 500))
      return res.status(502).json({ error: '식약처 API 응답을 해석할 수 없습니다' })
    }

    const resultCode = data?.response?.header?.resultCode

    // resultCode 03 = NODATA_ERROR: 검색 결과가 없다는 정상 응답(이때는 body 자체가 없다)이라 빈 배열로 처리한다.
    if (resultCode === '03') {
      return res.json([])
    }

    const items = extractFoodItems(data)

    if (items === null) {
      console.error('FoodSafety API: items 구조를 찾을 수 없음, 원본 응답 일부:', JSON.stringify(data).slice(0, 500))
      return res.status(502).json({ error: `식약처 API 응답 형식이 예상과 다릅니다 (resultCode: ${resultCode ?? '알 수 없음'})` })
    }

    if (!upstreamRes.ok && items.length === 0) {
      console.error('FoodSafety API error:', resultCode, data?.response?.header?.resultMsg)
      return res.status(upstreamRes.status).json({ error: data?.response?.header?.resultMsg || 'FoodSafety API error' })
    }

    res.json(items.map(normalizeFoodItem))
  } catch (err) {
    console.error('FoodSafety proxy request failed:', err)
    res.status(500).json({ error: 'Internal proxy error' })
  }
})

app.listen(PORT, () => {
  console.log(`Gemini proxy server listening on http://localhost:${PORT}`)
})
