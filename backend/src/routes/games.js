// RAWG 게임 검색 프록시. RAWG_API_KEY는 서버에서만 쓴다(프론트 번들 노출 금지).
// 프론트는 /api/games/search 만 부르고, 여기서 RAWG를 대신 호출·정규화·캐시한다.
import { Router } from 'express'

const router = Router()
const RAWG_URL = 'https://api.rawg.io/api/games'

// 같은 검색어 반복 호출을 아끼는 인메모리 캐시(무료 티어 월 2만 요청 보호).
const cache = new Map() // key(소문자 q) -> { at, data }
const TTL_MS = 1000 * 60 * 60 * 24

function normalize(g) {
  return {
    id: g.id,
    name: g.name,
    released: g.released ? g.released.slice(0, 4) : null,
    coverUrl: g.background_image || null,
    platforms: (g.platforms || [])
      .map((p) => p.platform?.name)
      .filter(Boolean)
      .slice(0, 4),
    genres: (g.genres || []).map((x) => x.name),
    tags: (g.tags || []).map((x) => x.name).slice(0, 10),
  }
}

// GET /api/games/search?q=zelda — 게임 이름 자동완성용.
router.get('/search', async (req, res) => {
  const q = String(req.query.q ?? '').trim()
  if (q.length < 2) return res.json([])

  const key = q.toLowerCase()
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < TTL_MS) return res.json(hit.data)

  const apiKey = process.env.RAWG_API_KEY
  if (!apiKey) return res.status(503).json({ error: 'RAWG_API_KEY 가 설정되지 않았습니다.' })

  try {
    const url = `${RAWG_URL}?key=${apiKey}&search=${encodeURIComponent(q)}&page_size=8&search_precise=true`
    const r = await fetch(url)
    if (!r.ok) return res.status(502).json({ error: '게임 검색에 실패했어요.' })
    const j = await r.json()
    const data = (j.results || []).map(normalize)
    cache.set(key, { at: Date.now(), data })
    res.json(data)
  } catch {
    res.status(502).json({ error: '게임 검색에 실패했어요.' })
  }
})

export default router
