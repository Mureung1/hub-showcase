// POST /api/gemini - OpenRouter(OpenAI 호환) chat/completions 프록시 (OPENROUTER_API_KEY는 서버에서만 사용)
import 'dotenv/config'
import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const PORT = process.env.PORT || process.env.PROXY_PORT || 8787
const MODEL = 'google/gemini-3-flash-preview'
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const APP_TITLE = 'CJMT'
const APP_REFERER = process.env.APP_URL || 'http://localhost:5173'
const KAKAO_KEYWORD_SEARCH_URL = 'https://dapi.kakao.com/v2/local/search/keyword.json'

// 식약처 식품영양성분DB: "음식"(조리식) API가 기본, "가공식품" API는 편의점/포장/프랜차이즈 제품 보완용 폴백. 파라미터·응답 구조는 동일하다.
const FOODSAFETY_SOURCES = {
  food: { url: 'https://api.data.go.kr/openapi/tn_pubr_public_nutri_food_info_api', envKey: 'FOODSAFETY_API_KEY' },
  process: { url: 'https://api.data.go.kr/openapi/tn_pubr_public_nutri_process_info_api', envKey: 'FOODSAFETY_PROC_API_KEY' },
}

const RETRY_DELAYS_MS = [1000, 2000, 4000]
const RETRYABLE_STATUS = new Set([429, 503])

// 외부 API(OpenRouter/카카오) 응답이 지연될 때 요청이 무한정 붙잡혀 있지 않도록 하는 타임아웃.
// 프론트의 fetchWithTimeout(28초)보다 짧게 잡아, 프론트가 자체 타임아웃을 띄우기 전에 서버가 먼저
// 의미 있는 에러 응답(504)을 내려줄 수 있게 한다.
const EXTERNAL_TIMEOUT_MS = 25000

// 식약처 API 전용 타임아웃. 배포 리전(해외 IP)에서는 api.data.go.kr 접속 자체가 막혀 있는 경우가 있는데,
// 그 상황에서 findFoodMatch가 최대 4번(음식DB→가공식품DB→재검색×2) 시도하며 매번 타임아웃을 기다리면
// 사진 분석 전체가 수십 초씩 걸린다. 짧게 잡아 "연결 안 됨"을 빨리 판정하고, 판정 즉시 나머지 시도를
// 건너뛰도록 한다(아래 /api/fooddb 핸들러의 FOODDB_CONNECTION_FAILED 참고).
const FOODSAFETY_TIMEOUT_MS = 5000

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchWithTimeout(url, options, timeoutMs = EXTERNAL_TIMEOUT_MS) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

async function fetchWithRetry(url, options) {
  let response = await fetchWithTimeout(url, options)

  for (const delay of RETRY_DELAYS_MS) {
    if (response.ok || !RETRYABLE_STATUS.has(response.status)) break
    await sleep(delay)
    response = await fetchWithTimeout(url, options)
  }

  return response
}

// 타임아웃(AbortError)을 504로, 그 외 예외를 500으로 매핑하는 공통 에러 핸들러.
// 데모 단계에서는 이 정도 구분만 두고, 레이트리밋/CORS 같은 강한 제한은 아래 자리에서 나중에 추가한다.
function respondToProxyError(res, err, label) {
  if (err.name === 'AbortError') {
    console.error(`${label}: upstream timeout`)
    return res.status(504).json({ error: '외부 서비스 응답이 지연되고 있습니다. 잠시 후 다시 시도해주세요.' })
  }
  console.error(`${label} failed:`, err)
  return res.status(500).json({ error: 'Internal proxy error' })
}

const app = express()
app.use(express.json({ limit: '15mb' }))

// TODO(공개 확대 시): 레이트리밋 미들웨어 자리 (예: express-rate-limit로 IP별 요청 수 제한).
// 소수 사용자 데모 단계라 지금은 생략.
// TODO(공개 확대 시): CORS 정책 자리 (예: cors 미들웨어로 허용 오리진 제한).
// 현재는 프론트/프록시가 동일 오리진으로 서빙되어 생략.

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
    respondToProxyError(res, err, 'OpenRouter proxy request')
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
    const kakaoRes = await fetchWithRetry(url, {
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
    respondToProxyError(res, err, 'Kakao proxy request')
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
    servSize: parseBaseQuantity(item?.servSize), // 가공식품의 1회 섭취참고량(음식 API는 보통 비어 있음)
    foodSize: item?.foodSize ?? null,
    brand: item?.mfrNm ?? null, // 가공식품 제조사명
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
function buildFoodSafetyUrl(baseUrl, apiKey, foodName, rawKey) {
  const params = new URLSearchParams({ pageNo: '1', numOfRows: '10', type: 'json', foodNm: foodName })
  if (rawKey) {
    return `${baseUrl}?serviceKey=${apiKey}&${params.toString()}`
  }
  params.set('serviceKey', apiKey)
  return `${baseUrl}?${params.toString()}`
}

async function callFoodSafetyApi(baseUrl, apiKey, foodName, rawKey) {
  const url = buildFoodSafetyUrl(baseUrl, apiKey, foodName, rawKey)
  const upstreamRes = await fetchWithTimeout(url, undefined, FOODSAFETY_TIMEOUT_MS)
  const raw = await upstreamRes.text()
  let data = null
  try {
    data = JSON.parse(raw)
  } catch {
    data = null
  }
  return { upstreamRes, raw, data }
}

// POST /api/fooddb - 식약처 전국통합식품영양성분정보 검색 프록시. body.source로 "음식"(기본) / "가공식품" DB를 선택한다.
// (FOODSAFETY_API_KEY / FOODSAFETY_PROC_API_KEY는 서버에서만 사용)
app.post('/api/fooddb', async (req, res) => {
  const { foodName, source = 'food' } = req.body || {}

  const sourceConfig = FOODSAFETY_SOURCES[source]
  if (!sourceConfig) {
    return res.status(400).json({ error: `source must be one of: ${Object.keys(FOODSAFETY_SOURCES).join(', ')}` })
  }

  const apiKey = process.env[sourceConfig.envKey]
  if (!apiKey) {
    return res.status(500).json({ error: `${sourceConfig.envKey} is not configured on the server` })
  }

  if (!foodName || typeof foodName !== 'string' || !foodName.trim()) {
    return res.status(400).json({ error: 'foodName is required' })
  }

  try {
    let { upstreamRes, raw, data } = await callFoodSafetyApi(sourceConfig.url, apiKey, foodName, false)

    // JSON 파싱 실패(보통 서비스키 인증 오류 시 XML로 응답) 또는 인증 오류 메시지면 반대 방식(raw key)으로 재시도
    if (!data || isAuthError(data)) {
      ;({ upstreamRes, raw, data } = await callFoodSafetyApi(sourceConfig.url, apiKey, foodName, true))
    }

    if (!data) {
      console.error(`FoodSafety API(${source}): JSON 파싱 실패, 원본 응답 일부:`, raw.slice(0, 500))
      return res.status(502).json({ error: '식약처 API 응답을 해석할 수 없습니다' })
    }

    const resultCode = data?.response?.header?.resultCode

    // resultCode 03 = NODATA_ERROR: 검색 결과가 없다는 정상 응답(이때는 body 자체가 없다)이라 빈 배열로 처리한다.
    if (resultCode === '03') {
      return res.json([])
    }

    const items = extractFoodItems(data)

    if (items === null) {
      console.error(`FoodSafety API(${source}): items 구조를 찾을 수 없음, 원본 응답 일부:`, JSON.stringify(data).slice(0, 500))
      return res.status(502).json({ error: `식약처 API 응답 형식이 예상과 다릅니다 (resultCode: ${resultCode ?? '알 수 없음'})` })
    }

    if (!upstreamRes.ok && items.length === 0) {
      console.error(`FoodSafety API(${source}) error:`, resultCode, data?.response?.header?.resultMsg)
      return res.status(upstreamRes.status).json({ error: data?.response?.header?.resultMsg || 'FoodSafety API error' })
    }

    res.json(items.map(normalizeFoodItem))
  } catch (err) {
    // 이 catch에 도달하는 예외는 전부 식약처 서버로의 네트워크 연결 실패(타임아웃 포함)다.
    // 그 외 실패 케이스는 위에서 전부 명시적으로 status를 응답하고 return하기 때문이다.
    // 배포 리전(해외 IP)에서는 api.data.go.kr 접속이 아예 안 되는 경우가 있는데, 이를 "검색
    // 결과 없음"(NODATA, 200 [])과 똑같이 응답하면 프론트가 계속 나머지 소스/재검색어로
    // 재시도한다 — 연결 자체가 안 되는 상황에서는 그 재시도도 전부 똑같이 실패할 뿐이라
    // 시간만 누적된다. 그래서 코드(FOODDB_CONNECTION_FAILED)를 실어 503으로 응답해 프론트가
    // "연결 실패"와 "결과 없음"을 구분해, 연결 실패일 때는 남은 재시도를 건너뛰고 즉시 AI
    // 추정치로 폴백하도록 한다(findFoodMatch 참고). 국내(로컬)에서는 연결이 정상이라 이 분기를
    // 타지 않고 기존처럼 식약처 DB를 계속 활용한다.
    console.error(`FoodSafety proxy(${source}) upstream connection failed:`, err.message)
    res.status(503).json({ error: '식약처 API 서버에 연결할 수 없습니다', code: 'FOODDB_CONNECTION_FAILED' })
  }
})

// 프로덕션(Render)에서는 이 서버가 빌드된 프론트(dist)까지 함께 서빙한다.
// 개발 환경(vite dev + node server)에서는 이 블록이 실행되지 않고 프록시 프론트는 vite dev server가 담당한다.
if (process.env.NODE_ENV === 'production') {
  const distDir = path.join(__dirname, '..', 'dist')

  app.use(express.static(distDir))

  // 정의된 /api 라우트에 매칭되지 않은 요청은 SPA 폴백 대신 JSON 404로 응답한다.
  app.use('/api', (req, res) => {
    res.status(404).json({ error: 'Not found' })
  })

  // /api가 아닌 나머지 GET 요청은 index.html로 폴백해 클라이언트 라우팅을 지원한다.
  app.get('/*splat', (req, res) => {
    res.sendFile(path.join(distDir, 'index.html'))
  })
}

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`)
})
