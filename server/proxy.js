// POST /api/gemini - OpenRouter(OpenAI 호환) chat/completions 프록시 (OPENROUTER_API_KEY는 서버에서만 사용)
import 'dotenv/config'
import express from 'express'
import path from 'node:path'
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { rateLimit } from 'express-rate-limit'
import { mapNeisAllergy } from '../src/lib/allergyRules.js'
import { resolveCnuWeekResult } from '../src/lib/cnuWeekFallback.js'
import { isSupportedUniversity } from '../src/lib/universities.js'
import * as cnuUnivMealAdapter from './univMealAdapters/cnu.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const PORT = process.env.PORT || process.env.PROXY_PORT || 8787
const MODEL = 'google/gemini-3-flash-preview'
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const APP_TITLE = 'Mealyze'
const APP_REFERER = process.env.APP_URL || 'http://localhost:5173'
const KAKAO_KEYWORD_SEARCH_URL = 'https://dapi.kakao.com/v2/local/search/keyword.json'
const KAKAO_ADDRESS_SEARCH_URL = 'https://dapi.kakao.com/v2/local/search/address.json'
const KAKAO_COORD2ADDRESS_URL = 'https://dapi.kakao.com/v2/local/geo/coord2address.json'
const NAVER_LOCAL_SEARCH_URL = 'https://naverapihub.apigw.ntruss.com/search/v1/local'
// 지역 검색 정렬: 'comment'(리뷰 많은 순 — 추천 품질용 기본값) | 'random'(무작위 — 예전 동작)
const NAVER_LOCAL_SORT = 'comment'

// 식약처 식품영양성분DB: "음식"(조리식) API가 기본, "가공식품" API는 편의점/포장/프랜차이즈 제품 보완용 폴백. 파라미터·응답 구조는 동일하다.
const FOODSAFETY_SOURCES = {
  food: { url: 'https://api.data.go.kr/openapi/tn_pubr_public_nutri_food_info_api', envKey: 'FOODSAFETY_API_KEY' },
  process: { url: 'https://api.data.go.kr/openapi/tn_pubr_public_nutri_process_info_api', envKey: 'FOODSAFETY_PROC_API_KEY' },
}

// NEIS(나이스) 교육정보 개방포털: 학교기본정보(학교 검색) + 급식식단정보(초중고 급식 조회).
const NEIS_SCHOOL_INFO_URL = 'https://open.neis.go.kr/hub/schoolInfo'
const NEIS_MEAL_INFO_URL = 'https://open.neis.go.kr/hub/mealServiceDietInfo'

// 대학 학식 "C안 하이브리드"(PRD 1.2): 대학별 크롤러 어댑터 + 크롤링 실패 시 대신 쓸 수동 폴백 JSON.
// path.join(__dirname, ...)로 읽어야 Vercel의 정적 파일 추적(@vercel/nft)이 이 파일을 배포 번들에
// 포함시킨다 — 동적으로 조립한 경로는 추적되지 않아 배포본에서 파일이 빠질 수 있다.
const UNIV_MEAL_ADAPTERS = { cnu: cnuUnivMealAdapter }
const UNIV_MEAL_FALLBACK_PATH = path.join(__dirname, 'data', 'univ-meals.json')
const univMealFallbackData = JSON.parse(readFileSync(UNIV_MEAL_FALLBACK_PATH, 'utf8'))

// 크롤링 성공 결과를 폴백 파일에도 반영해둔다(Step 7-1) — 다음 크롤링 실패 때 이것이 최신 폴백이
// 된다. 파일 쓰기가 막힌 배포 환경(일부 서버리스의 읽기 전용 파일시스템)에서도 실패를 무시한다 —
// 이미 이번 응답은 라이브 데이터로 성공했고, 메모리 갱신(univMealFallbackData)만으로도 이번
// 프로세스가 떠 있는 동안은 폴백 최신성이 유지된다.
function persistUnivFallback(univ, liveResult) {
  univMealFallbackData[univ] = {
    week: liveResult.week,
    updatedAt: new Date().toISOString().slice(0, 10),
    days: liveResult.days,
  }
  try {
    writeFileSync(UNIV_MEAL_FALLBACK_PATH, JSON.stringify(univMealFallbackData, null, 2) + '\n')
  } catch (err) {
    console.error('univ-meals.json 폴백 파일 갱신 실패(무시하고 계속):', err.message)
  }
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

// NEIS도 공공데이터포털 계열이라 식약처와 같은 이유로 짧게 잡는다 — 학교/학식 조회는 화면에서
// 즉시 체감되는 화면(지도 탭 서브 영역)이라 오래 붙잡는 대신 빨리 실패해 폴백/에러 안내로 넘어간다.
const NEIS_TIMEOUT_MS = 8000

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

// 급식(NEIS)·학식(크롤링) 데이터는 하루 단위로만 바뀌므로, 자정까지 남은 시간만큼만 캐시해
// 호출을 아낀다(당일 TTL — PRD 1.5). 서버 프로세스 메모리에만 있어 재배포/재시작 시 자연히 비워진다.
const dayCache = new Map()

function msUntilNextMidnight() {
  const now = new Date()
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0)
  return next.getTime() - now.getTime()
}

function getCached(key) {
  const entry = dayCache.get(key)
  if (!entry) return undefined
  if (Date.now() >= entry.expiresAt) {
    dayCache.delete(key)
    return undefined
  }
  return entry.value
}

function setCached(key, value) {
  dayCache.set(key, { value, expiresAt: Date.now() + msUntilNextMidnight() })
}

// 대학 학식 주간 크롤링(4주차 보강 Step 7-1)은 자정 기준이 아니라 명시적 24시간 TTL을 쓴다 —
// 메뉴 정정 가능성을 감안해 "하루 1회 재확인" 의미로, 같은 dayCache Map을 키 네임스페이스로만 구분해 재사용한다.
function setCachedWithTtl(key, value, ttlMs) {
  dayCache.set(key, { value, expiresAt: Date.now() + ttlMs })
}

// YYYYMMDD 형식 + 실존하는 날짜인지(예: 20260231 같은 값 거부)까지 확인한다.
function isValidYmd(str) {
  if (!/^\d{8}$/.test(str)) return false
  const y = Number(str.slice(0, 4))
  const m = Number(str.slice(4, 6))
  const d = Number(str.slice(6, 8))
  const date = new Date(y, m - 1, d)
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d
}

function daysBetweenYmd(from, to) {
  const toUtcMs = (str) => Date.UTC(Number(str.slice(0, 4)), Number(str.slice(4, 6)) - 1, Number(str.slice(6, 8)))
  return Math.round((toUtcMs(to) - toUtcMs(from)) / (24 * 60 * 60 * 1000))
}

const NEIS_MEAL_TYPE_BY_CODE = { 1: 'breakfast', 2: 'lunch', 3: 'dinner' }

const NEIS_NUTRIENT_LABEL_PATTERNS = [
  [/^탄수화물/, 'carbs'],
  [/^단백질/, 'protein'],
  [/^지방/, 'fat'],
  [/^비타민a/i, 'vitaminA'],
  [/^티아민/, 'thiamine'],
  [/^리보플라빈/, 'riboflavin'],
  [/^비타민c/i, 'vitaminC'],
  [/^칼슘/, 'calcium'],
  [/^철분/, 'iron'],
]

// "메뉴명 (1.2.5.6)" 형태에서 메뉴명과 NEIS 알레르기 번호를 분리하고, 번호는 곧바로 밀라이즈
// 코드로 변환해둔다(allergyRules.mapNeisAllergy) — 화면은 NEIS 번호 체계를 몰라도 된다.
function parseNeisMenus(ddishNm) {
  return (ddishNm || '')
    .split(/<br\s*\/?>/i)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const m = line.match(/^(.*?)\s*\(([\d.]+)\)\s*$/)
      if (!m) return { name: line, allergyCodes: [] }
      const numbers = m[2]
        .split('.')
        .map(Number)
        .filter((n) => Number.isInteger(n) && n >= 1 && n <= 19)
      return { name: m[1].trim(), allergyCodes: mapNeisAllergy(numbers) }
    })
}

function parseNeisNutrients(ntrInfo) {
  const nutrients = {}
  for (const line of (ntrInfo || '').split(/<br\s*\/?>/i)) {
    const m = line.match(/^([^:]+):\s*([\d.]+)/)
    if (!m) continue
    const label = m[1].trim()
    const value = Number.parseFloat(m[2])
    const found = NEIS_NUTRIENT_LABEL_PATTERNS.find(([pattern]) => pattern.test(label))
    if (found) nutrients[found[1]] = value
  }
  return nutrients
}

function normalizeNeisMealRows(rows) {
  const byDate = new Map()
  for (const row of rows) {
    const date = row.MLSV_YMD
    if (!byDate.has(date)) byDate.set(date, [])
    byDate.get(date).push({
      mealType: NEIS_MEAL_TYPE_BY_CODE[Number(row.MMEAL_SC_CODE)] || row.MMEAL_SC_NM,
      menus: parseNeisMenus(row.DDISH_NM),
      calories: row.CAL_INFO ? Number.parseFloat(row.CAL_INFO) : null,
      nutrients: parseNeisNutrients(row.NTR_INFO),
    })
  }
  return Array.from(byDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, meals]) => ({ date, meals }))
}

const app = express()
// Render/Vercel 둘 다 리버스 프록시 한 홉을 거쳐 요청이 들어온다. 이걸 켜지 않으면
// req.ip가 프록시 자신의 IP로 고정돼 아래 rate limiter가 모든 사용자를 한 버킷으로 묶어버린다.
app.set('trust proxy', 1)
// 사진(base64)을 받는 /api/gemini만 큰 본문이 필요하다 — 나머지 라우트까지 15mb를 전부 허용하면
// 이미지가 필요 없는 라우트(/api/fooddb 등)로도 대용량 POST를 보내 메모리를 낭비시키기 쉬워진다.
app.use('/api/gemini', express.json({ limit: '15mb' }))
app.use(express.json({ limit: '1mb' }))

// express.json이 위 limit 초과("entity.too.large") 또는 잘못된 JSON("entity.parse.failed")을
// next(err)로 넘기면, 이 미들웨어가 없을 때는 Express 기본 에러 핸들러가 서버 파일 경로가 담긴 HTML
// 스택트레이스를 그대로 응답한다 — 다른 모든 라우트가 JSON 에러만 응답하는 것과 어긋나고, 불필요하게
// 내부 정보를 노출한다.
app.use((err, req, res, next) => {
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({ error: '요청 본문이 너무 큽니다.' })
  }
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: '요청 본문을 해석할 수 없습니다.' })
  }
  next(err)
})

// TODO(공개 확대 시): CORS 정책 자리 (예: cors 미들웨어로 허용 오리진 제한).
// 현재는 프론트/프록시가 동일 오리진으로 서빙되어 생략.

// 모든 /api 요청은 서버가 들고 있는 유료/쿼터 제한 키(OpenRouter, Kakao, Naver, 식약처)를 대신
// 소모한다. 인증이 없는 공개 데모 단계라, IP당 요청 수를 제한해 스크립트로 반복 호출해 쿼터를
// 소진시키거나 과금을 유발하는 남용을 막는다.
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
})

// /api/gemini는 토큰당 과금되는 OpenRouter 호출이라 다른 라우트보다 더 촘촘하게 제한한다.
const geminiLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
})

app.use('/api', apiLimiter)

// Vercel 배포에서는 vercel.json의 rewrite가 /api/* 전체를 이 함수 하나(api/index.js)로 보낸다.
// destination이 실제로 원래 하위 경로(/api/gemini 등)를 그대로 유지해주는지는 Vercel 내부
// 라우팅 구현에 따라 달라질 수 있어, 안전하게 원래 경로를 vercelSubpath 쿼리 파라미터로도 함께
// 실어 보내고(rewrite destination 참고), 여기서 req.url을 그 값으로 복원한다. 이미 원래 경로가
// 유지되고 있었다면 이 복원은 같은 값으로 덮어쓰는 것이라 무해하다. 로컬 개발/Render에서는
// 이 rewrite 자체가 없어 vercelSubpath가 없으므로 이 분기를 타지 않는다.
//
// vercelSubpath는 경로만 담고 있다 — 그 외 원래 쿼리 파라미터(?univ=cnu, ?name=... 등)는 Vercel이
// rewrite destination에 그대로 딸려 보내 req.url에 이미 살아있으므로, 그 문자열에서 vercelSubpath만
// 제거하고 나머지는 그대로 옮겨 붙여야 한다. 예전에는 vercelSubpath 값만으로 req.url을 통째로
// 다시 만들어 나머지 쿼리 파라미터가 전부 사라졌다 — POST 바디로만 값을 받는 라우트만 있던 동안은
// 드러나지 않다가, 쿼리 파라미터가 실제 동작에 필요한 GET 라우트(/api/school-search 등)가 생기며
// 그 라우트들이 프로덕션(Vercel)에서만 400으로 실패하는 문제로 나타났다.
if (process.env.VERCEL) {
  app.use((req, res, next) => {
    const subpath = req.query?.vercelSubpath
    if (typeof subpath === 'string') {
      const [, search = ''] = req.url.split('?')
      const params = new URLSearchParams(search)
      params.delete('vercelSubpath')
      const qs = params.toString()
      req.url = `/api/${subpath}${qs ? `?${qs}` : ''}`
    }
    next()
  })
}

app.post('/api/gemini', geminiLimiter, async (req, res) => {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'OPENROUTER_API_KEY is not configured on the server' })
  }

  const { prompt, system, imageBase64, mimeType, schema, schemaName, temperature } = req.body || {}
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

  // 구조화 출력(json_schema)·temperature — 클라이언트(geminiSchemas.js)가 호출별로 실어 보낸다.
  const requestBody = { model: MODEL, messages }
  if (typeof temperature === 'number' && temperature >= 0 && temperature <= 2) {
    requestBody.temperature = temperature
  }
  if (schema && typeof schema === 'object') {
    requestBody.response_format = {
      type: 'json_schema',
      json_schema: { name: typeof schemaName === 'string' ? schemaName : 'result', strict: true, schema },
    }
  }

  const callOpenRouter = (body) =>
    fetchWithRetry(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': APP_REFERER,
        'X-Title': APP_TITLE,
      },
      body: JSON.stringify(body),
    })

  try {
    const startedAt = Date.now()
    let openRouterRes = await callOpenRouter(requestBody)
    let data = await openRouterRes.json()

    // 스키마 강제가 원인일 수 있는 실패(4xx)면 스키마 없이 1회 재시도한다 — 모델/프로바이더가
    // 구조화 출력을 거부해도 기능 전체가 죽지 않게. 클라이언트의 parseJsonLoose가 그 폴백을 받는다.
    if (!openRouterRes.ok && requestBody.response_format && openRouterRes.status < 500) {
      console.warn(
        `OpenRouter response_format 요청 실패(${openRouterRes.status}) — 스키마 없이 재시도:`,
        data?.error?.message || '',
      )
      const withoutSchema = { ...requestBody }
      delete withoutSchema.response_format
      openRouterRes = await callOpenRouter(withoutSchema)
      data = await openRouterRes.json()
    }

    if (!openRouterRes.ok) {
      console.error('OpenRouter API error:', data)
      return res.status(openRouterRes.status).json({ error: data?.error?.message || 'OpenRouter API error' })
    }

    // 토큰 사용량·응답 시간 로그 — docs/04-프로젝트설명/cost-analysis.md의 추정치를 실측값으로 교체할 때 근거로 쓴다.
    if (data?.usage) {
      console.log(
        `Gemini usage: prompt=${data.usage.prompt_tokens ?? '?'} completion=${data.usage.completion_tokens ?? '?'} ` +
          `total=${data.usage.total_tokens ?? '?'} image=${imageBase64 ? 'Y' : 'N'} ` +
          `schema=${requestBody.response_format ? 'Y' : 'N'} ${Date.now() - startedAt}ms`,
      )
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

// POST /api/geocode - 지역명/주소 -> 좌표 변환. 카카오 주소 검색 API를 먼저 쓰고(정식 주소에 정확),
// 결과가 없으면 카카오 키워드 검색 API로 재시도한다(역/랜드마크/상호명처럼 주소 형식이 아닌 지역명 대응).
app.post('/api/geocode', async (req, res) => {
  const apiKey = process.env.KAKAO_REST_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'KAKAO_REST_API_KEY is not configured on the server' })
  }

  const { query } = req.body || {}
  if (!query || typeof query !== 'string' || !query.trim()) {
    return res.status(400).json({ error: 'query is required' })
  }

  try {
    const addressUrl = new URL(KAKAO_ADDRESS_SEARCH_URL)
    addressUrl.searchParams.set('query', query)

    const addressRes = await fetchWithRetry(addressUrl, { headers: { Authorization: `KakaoAK ${apiKey}` } })
    const addressData = await addressRes.json()

    if (!addressRes.ok) {
      console.error('Kakao address search error:', addressData)
      return res.status(addressRes.status).json({ error: addressData?.message || 'Kakao API error' })
    }

    const addressDoc = addressData?.documents?.[0]
    if (addressDoc) {
      return res.json({ x: addressDoc.x, y: addressDoc.y, label: addressDoc.address_name })
    }

    // 주소 검색 결과가 없으면(역/랜드마크/상호명 등 정식 주소가 아닌 지역명) 키워드 검색으로 재시도
    const keywordUrl = new URL(KAKAO_KEYWORD_SEARCH_URL)
    keywordUrl.searchParams.set('query', query)
    keywordUrl.searchParams.set('size', '1')

    const keywordRes = await fetchWithRetry(keywordUrl, { headers: { Authorization: `KakaoAK ${apiKey}` } })
    const keywordData = await keywordRes.json()

    if (!keywordRes.ok) {
      console.error('Kakao keyword geocode fallback error:', keywordData)
      return res.status(keywordRes.status).json({ error: keywordData?.message || 'Kakao API error' })
    }

    const keywordDoc = keywordData?.documents?.[0]
    if (!keywordDoc) {
      return res.status(404).json({ error: '해당 위치를 찾을 수 없습니다' })
    }

    res.json({ x: keywordDoc.x, y: keywordDoc.y, label: keywordDoc.place_name })
  } catch (err) {
    respondToProxyError(res, err, 'Kakao geocode proxy request')
  }
})

// POST /api/reverse-geocode - 좌표 -> 대략적 지역명(시/군/구). 네이버 지역 검색(아래 /api/naver-places)은
// 반경 파라미터가 없어 검색어에 이 지역명을 섞어 넣어야("유성구 고깃집") "내 주변" 느낌을 낼 수 있다 —
// 그 지역명을 얻기 위해 카카오 좌표->주소 변환 API를 재사용한다(음식점 검색 자체와는 무관).
app.post('/api/reverse-geocode', async (req, res) => {
  const apiKey = process.env.KAKAO_REST_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'KAKAO_REST_API_KEY is not configured on the server' })
  }

  const { x, y } = req.body || {}
  if (!x || !y) {
    return res.status(400).json({ error: 'x, y are required' })
  }

  try {
    const url = new URL(KAKAO_COORD2ADDRESS_URL)
    url.searchParams.set('x', x)
    url.searchParams.set('y', y)

    const kakaoRes = await fetchWithRetry(url, { headers: { Authorization: `KakaoAK ${apiKey}` } })
    const data = await kakaoRes.json()

    if (!kakaoRes.ok) {
      console.error('Kakao coord2address error:', data)
      return res.status(kakaoRes.status).json({ error: data?.message || 'Kakao API error' })
    }

    const address = data?.documents?.[0]?.address
    const label = address?.region_2depth_name || address?.region_1depth_name || null
    if (!label) {
      return res.status(404).json({ error: '지역명을 찾을 수 없습니다' })
    }

    res.json({ label })
  } catch (err) {
    respondToProxyError(res, err, 'Kakao reverse geocode proxy request')
  }
})

function stripHtml(str) {
  if (typeof str !== 'string') return ''
  return str
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

// 위도 33~39, 경도 124~132는 대략적인 대한민국 영역 — mapx/mapy를 1e7로 나눈 변환값이 이 범위를
// 벗어나면 좌표 변환식이나 응답 필드를 잘못 읽었다는 신호라 경고 로그만 남긴다(요청 자체는 그대로 응답).
function logIfOutsideKorea(name, lat, lng) {
  if (lat < 33 || lat > 39 || lng < 124 || lng > 132) {
    console.warn(`Naver local search: "${name}" 좌표가 한국 범위를 벗어남 (lat=${lat}, lng=${lng})`)
  }
}

// POST /api/naver-places - 네이버 API Hub 지역 검색 프록시
// (NAVER_SEARCH_CLIENT_ID/NAVER_SEARCH_CLIENT_SECRET는 서버에서만 사용, 클라이언트로 반환하지 않는다)
app.post('/api/naver-places', async (req, res) => {
  const clientId = process.env.NAVER_SEARCH_CLIENT_ID
  const clientSecret = process.env.NAVER_SEARCH_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    return res.status(500).json({ error: 'NAVER_SEARCH_CLIENT_ID/NAVER_SEARCH_CLIENT_SECRET is not configured on the server' })
  }

  const { query } = req.body || {}
  if (!query || typeof query !== 'string' || !query.trim()) {
    return res.status(400).json({ error: 'query is required' })
  }

  const url = new URL(NAVER_LOCAL_SEARCH_URL)
  url.searchParams.set('query', query.trim())
  // display 실측(2026-07): 10/15/30을 요청해도 항상 최대 5건만 반환된다(API Hub 지역 검색의 실질
  // 상한). 후보 풀을 늘리려면 이 값이 아니라 "서로 다른 키워드로 병렬 검색"을 늘려야 한다(MapPage).
  url.searchParams.set('display', '5')
  url.searchParams.set('start', '1')
  // random → comment(리뷰 많은 순): 추천 품질을 위해 검증된 인기 식당을 우선한다. 결과가 결정적이라
  // 같은 위치·키워드면 같은 후보가 나온다(예전 random은 매번 달랐음). 되돌리려면 이 값만 'random'으로.
  url.searchParams.set('sort', NAVER_LOCAL_SORT)
  url.searchParams.set('format', 'json')

  try {
    const naverRes = await fetchWithRetry(url, {
      headers: {
        'X-NCP-APIGW-API-KEY-ID': clientId,
        'X-NCP-APIGW-API-KEY': clientSecret,
      },
    })

    const data = await naverRes.json().catch(() => null)

    if (!naverRes.ok) {
      if (naverRes.status === 401) {
        console.error('Naver local search API 인증 실패(401) — 키/서명을 확인하세요:', data)
      } else if (naverRes.status === 429) {
        console.error('Naver local search API 호출 한도 초과(429):', data)
      } else {
        console.error('Naver local search API error:', naverRes.status, data)
      }
      return res.status(naverRes.status).json({ error: data?.errorMessage || data?.message || 'Naver local search API error' })
    }

    // 응답은 200인데 total>0인데도 items가 비어 있는 경우가 있다 — 이 상품(지역 검색)이 NCP 콘솔에서
    // 인증까지는 통과했지만(그래서 401이 아님) 실제 콘텐츠 제공은 별도 승인/설정이 더 필요한 상태일
    // 가능성이 높다(뉴스 등 다른 검색 상품처럼 활성화가 안 된 경우는 보통 곧바로 401을 준다). 코드
    // 버그와 구분하기 위해 경고 로그를 남긴다.
    if ((data?.total ?? 0) > 0 && (data?.items?.length ?? 0) === 0) {
      console.warn(
        `Naver local search: query="${query}" total=${data.total}인데 items가 비어 있음 — ` +
          `NCP 콘솔에서 지역 검색 상품 활성화/승인 상태를 확인하세요.`,
      )
    }

    const places = (data?.items || []).map((item) => {
      const lng = Number(item.mapx) / 1e7
      const lat = Number(item.mapy) / 1e7
      const name = stripHtml(item.title)
      logIfOutsideKorea(name, lat, lng)
      return {
        name,
        address: item.address || '',
        roadAddress: item.roadAddress || '',
        category: item.category || '',
        link: item.link || null,
        lat,
        lng,
      }
    })

    res.json(places)
  } catch (err) {
    respondToProxyError(res, err, 'Naver local search proxy request')
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

// GET /api/school-search?name=학교명 - NEIS 학교기본정보 검색 프록시 (NEIS_API_KEY는 서버에서만 사용)
app.get('/api/school-search', async (req, res) => {
  const apiKey = process.env.NEIS_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'NEIS_API_KEY is not configured on the server' })
  }

  const name = (req.query.name || '').toString().trim()
  if (name.length < 2) {
    return res.status(400).json({ error: 'name은 2자 이상이어야 합니다' })
  }

  try {
    const url = new URL(NEIS_SCHOOL_INFO_URL)
    url.searchParams.set('KEY', apiKey)
    url.searchParams.set('Type', 'json')
    url.searchParams.set('pIndex', '1')
    url.searchParams.set('pSize', '20')
    url.searchParams.set('SCHUL_NM', name)

    const upstream = await fetchWithTimeout(url.toString(), undefined, NEIS_TIMEOUT_MS)
    if (!upstream.ok) {
      return res.status(502).json({ error: 'NEIS 서버 응답 오류' })
    }
    const data = await upstream.json()
    // NEIS는 결과가 없으면 "schoolInfo" 자체가 없는 성공(200) 응답을 준다 — 에러가 아니라 빈 배열이다.
    const rows = data?.schoolInfo?.[1]?.row ?? []
    const schools = rows.map((r) => ({
      name: r.SCHUL_NM,
      officeCode: r.ATPT_OFCDC_SC_CODE,
      officeName: r.ATPT_OFCDC_SC_NM,
      schoolCode: r.SD_SCHUL_CODE,
      kind: r.SCHUL_KND_SC_NM,
    }))
    res.json({ schools })
  } catch (err) {
    respondToProxyError(res, err, '/api/school-search')
  }
})

// GET /api/school-meal?officeCode=&schoolCode=&from=YYYYMMDD&to=YYYYMMDD
// NEIS 급식식단정보 프록시. 학교코드 형식·날짜 범위(최대 31일)를 검증해 프록시를 임의 크롤러로
// 악용하는 것을 막고, 하루 단위 데이터라 자정까지 캐시해 쿼터를 아낀다(당일 TTL).
app.get('/api/school-meal', async (req, res) => {
  const apiKey = process.env.NEIS_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'NEIS_API_KEY is not configured on the server' })
  }

  const officeCode = (req.query.officeCode || '').toString().trim()
  const schoolCode = (req.query.schoolCode || '').toString().trim()
  const from = (req.query.from || '').toString().trim()
  const to = (req.query.to || '').toString().trim()

  if (!/^[A-Z][0-9A-Z]{2}$/.test(officeCode)) {
    return res.status(400).json({ error: 'officeCode 형식이 올바르지 않습니다' })
  }
  if (!/^\d{5,10}$/.test(schoolCode)) {
    return res.status(400).json({ error: 'schoolCode 형식이 올바르지 않습니다' })
  }
  if (!isValidYmd(from) || !isValidYmd(to)) {
    return res.status(400).json({ error: 'from/to는 YYYYMMDD 형식이어야 합니다' })
  }
  if (from > to) {
    return res.status(400).json({ error: 'from은 to보다 이전이어야 합니다' })
  }
  if (daysBetweenYmd(from, to) > 31) {
    return res.status(400).json({ error: '조회 범위는 최대 31일입니다' })
  }

  const cacheKey = `school-meal:${officeCode}:${schoolCode}:${from}:${to}`
  const cached = getCached(cacheKey)
  if (cached) {
    return res.json(cached)
  }

  try {
    const url = new URL(NEIS_MEAL_INFO_URL)
    url.searchParams.set('KEY', apiKey)
    url.searchParams.set('Type', 'json')
    url.searchParams.set('pIndex', '1')
    url.searchParams.set('pSize', '100')
    url.searchParams.set('ATPT_OFCDC_SC_CODE', officeCode)
    url.searchParams.set('SD_SCHUL_CODE', schoolCode)
    url.searchParams.set('MLSV_FROM_YMD', from)
    url.searchParams.set('MLSV_TO_YMD', to)

    const upstream = await fetchWithTimeout(url.toString(), undefined, NEIS_TIMEOUT_MS)
    if (!upstream.ok) {
      return res.status(502).json({ error: 'NEIS 서버 응답 오류' })
    }
    const data = await upstream.json()
    // NEIS는 결과가 없을 때도 "row" 없는 성공(200) 응답을 준다 — 방학·주말은 에러가 아니라 빈 배열이다.
    const rows = data?.mealServiceDietInfo?.[1]?.row ?? []
    const payload = { days: normalizeNeisMealRows(rows) }
    setCached(cacheKey, payload)
    res.json(payload)
  } catch (err) {
    respondToProxyError(res, err, '/api/school-meal')
  }
})

// GET /api/univ-meal?univ=cnu[&week=YYYYMMDD] - 대학 학식 C안 하이브리드, 5개 식당 × 주간 단위
// (4주차 보강 Step 7-1). 1차 크롤링(건물 4곳 병렬) → 2차 수동 폴백 JSON → 3차 빈 상태. 판정 자체는
// 순수 함수 resolveCnuWeekResult가 맡고(src/lib/cnuWeekFallback.js, 테스트도 그쪽에 있다), 여기는
// 그 입력(크롤링 결과/폴백 항목)만 만든다. 이 사이트는 요청 파라미터와 무관하게 항상 "이번 주"만
// 주므로 week는 실질적으로 응답에 영향을 주지 않지만(과거 date= 호출과의 하위호환 겸 형식 검증용),
// 값이 오면 형식만 검증한다. 개발 모드에서만 ?forceFailure=1로 크롤링을 강제 실패시켜 폴백 경로를
// 재현할 수 있다 — 이 요청은 캐시를 읽지도 쓰지도 않아 이후 정상 요청의 결과를 오염시키지 않는다.
const UNIV_WEEK_CACHE_TTL_MS = 24 * 60 * 60 * 1000

app.get('/api/univ-meal', async (req, res) => {
  const univ = (req.query.univ || '').toString().trim()
  // week가 새 파라미터, date는 예전 호출과의 하위호환(둘 다 형식만 검증하고 실제로는 안 쓴다).
  const weekParam = (req.query.week || req.query.date || '').toString().trim()

  if (!isSupportedUniversity(univ)) {
    return res.status(400).json({ error: `지원하지 않는 대학입니다: ${univ}` })
  }
  if (weekParam && !isValidYmd(weekParam)) {
    return res.status(400).json({ error: 'week는 YYYYMMDD 형식이어야 합니다' })
  }

  const forceFailure = process.env.NODE_ENV !== 'production' && req.query.forceFailure === '1'
  const cacheKey = `univ-week:${univ}`

  if (!forceFailure) {
    const cached = getCached(cacheKey)
    if (cached) {
      return res.json(cached)
    }
  }

  let liveResult = null
  if (!forceFailure) {
    try {
      liveResult = await UNIV_MEAL_ADAPTERS[univ].fetchWeeklyMenu()
      persistUnivFallback(univ, liveResult)
    } catch (err) {
      // 구조 변경 감지용 — 크롤링이 계속 실패하면 이 로그로 원인(HTTP 에러/타임아웃/파싱 예외)을 알 수 있다.
      console.error(`univ-meal(${univ}) crawl failed:`, err.message)
      liveResult = null
    }
  }

  const fallbackWeek = univMealFallbackData[univ] ?? null
  const result = resolveCnuWeekResult({ liveResult, fallbackWeek })
  if (!forceFailure) {
    setCachedWithTtl(cacheKey, result, UNIV_WEEK_CACHE_TTL_MS)
  }
  res.json(result)
})

// Render처럼 이 서버 프로세스 하나가 빌드된 프론트(dist)까지 함께 서빙하는 배포에서만 켠다.
// 로컬 개발(vite dev + node server)에서는 NODE_ENV가 production이 아니라 이 블록이 실행되지
// 않고, 프론트는 vite dev server가 담당한다. Vercel(process.env.VERCEL)에서는 정적 파일과 SPA
// 폴백을 vercel.json/Vercel 플랫폼이 직접 처리하므로 이 블록이 필요 없다 — 오히려 이 함수의
// 배포 번들에는 dist/가 없어 sendFile이 깨질 수 있으므로 명시적으로 건너뛴다.
if (process.env.NODE_ENV === 'production' && !process.env.VERCEL) {
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

// Vercel 서버리스 환경(process.env.VERCEL은 Vercel이 배포 시 자동으로 심어주는 값)에서는
// app.listen()으로 직접 서버를 띄우지 않고 Express 앱 자체를 핸들러로 export한다 — api/index.js가
// 이 export를 그대로 가져다 쓴다. 로컬 개발(npm run server)과 Render 배포에서는 지금처럼
// listen해서 동작한다(둘 다 process.env.VERCEL이 없다).
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`)
  })
}

export default app
