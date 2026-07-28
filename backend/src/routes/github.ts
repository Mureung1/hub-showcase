import { Router, Response } from 'express'
import { githubService } from '../services/githubService'
import { llmService } from '../services/llmService'
import { AuthRequest, verifyAuth } from '../middleware/auth'

const router = Router()

/**
 * GET /api/github/trending
 * 인기 저장소 조회 (선택사항: 언어별, 제한 개수)
 */
router.get('/trending', async (req: AuthRequest, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 300, 300)
    const language = req.query.language as string

    console.log(`📥 Fetching trending repos (language: ${language || 'all'}, limit: ${limit})`)

    const repos = await githubService.getTrendingRepos(limit)

    if (language) {
      const filtered = repos.filter(r => r.language?.toLowerCase() === language.toLowerCase())
      return res.json({
        success: true,
        count: filtered.length,
        data: filtered,
      })
    }

    res.json({
      success: true,
      count: repos.length,
      data: repos,
    })
  } catch (error) {
    console.error('❌ Error fetching trending repos:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

/**
 * GET /api/github/recent
 * 최근 저장소 조회
 */
router.get('/recent', async (req: AuthRequest, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 300, 300)
    const language = req.query.language as string

    console.log(`📥 Fetching recent repos (language: ${language || 'all'}, limit: ${limit})`)

    const repos = await githubService.fetchRecentRepos(language, limit)

    res.json({
      success: true,
      count: repos.length,
      data: repos,
    })
  } catch (error) {
    console.error('❌ Error fetching recent repos:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

/**
 * GET /api/github/active
 * 활발한 저장소 조회
 */
router.get('/active', async (req: AuthRequest, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 300, 300)
    const language = req.query.language as string

    console.log(`📥 Fetching active repos (language: ${language || 'all'}, limit: ${limit})`)

    const repos = await githubService.fetchActiveRepos(language, limit)

    res.json({
      success: true,
      count: repos.length,
      data: repos,
    })
  } catch (error) {
    console.error('❌ Error fetching active repos:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

/**
 * GET /api/github/search
 * 저장소 검색
 */
router.get('/search', async (req: AuthRequest, res: Response) => {
  try {
    const query = req.query.q as string
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50)

    if (!query || query.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Query must be at least 2 characters',
      })
    }

    const results = await githubService.searchRepos(query, limit)

    res.json({
      success: true,
      count: results.length,
      query,
      data: results,
    })
  } catch (error) {
    console.error('❌ Error searching repos:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

/**
 * GET /api/github/:githubId
 * 저장소 상세 조회
 */
router.get('/:githubId', async (req: AuthRequest, res: Response) => {
  try {
    const githubId = parseInt(req.params.githubId)

    if (isNaN(githubId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid GitHub ID',
      })
    }

    const repo = await githubService.getRepoById(githubId)

    if (!repo) {
      return res.status(404).json({
        success: false,
        error: 'Repository not found',
      })
    }

    res.json({
      success: true,
      data: repo,
    })
  } catch (error) {
    console.error('❌ Error fetching repo details:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

/**
 * GET /api/github/language/:lang
 * 언어별 저장소 조회
 */
router.get('/language/:lang', async (req: AuthRequest, res: Response) => {
  try {
    const language = req.params.lang
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50)

    const repos = await githubService.getReposByLanguage(language, limit)

    res.json({
      success: true,
      language,
      count: repos.length,
      data: repos,
    })
  } catch (error) {
    console.error('❌ Error fetching repos by language:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

/**
 * POST /api/github/collect
 * GitHub에서 인기 저장소 수집 및 요약 (관리자 전용)
 */
router.post('/collect', verifyAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { language, limit = 20 } = req.body

    // 백그라운드에서 실행 (즉시 응답)
    githubService.collectAndSummarizeRepos(language, limit).catch(error => {
      console.error('❌ Background collection error:', error)
    })

    res.json({
      success: true,
      message: '저장소 수집이 시작되었습니다',
      params: { language, limit },
    })
  } catch (error) {
    console.error('❌ Error starting collection:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

/**
 * GET /api/github/llm/status
 * LLM 상태 확인
 */
router.get('/llm/status', async (req: AuthRequest, res: Response) => {
  try {
    const info = llmService.getInfo()

    res.json({
      success: true,
      llm: info,
    })
  } catch (error) {
    console.error('❌ Error checking LLM status:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

/**
 * POST /api/github/summarize
 * 텍스트 요약 API (테스트용)
 */
router.post('/summarize', verifyAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { text, type = 'summary' } = req.body

    if (!text || text.length < 10) {
      return res.status(400).json({
        success: false,
        error: 'Text must be at least 10 characters',
      })
    }

    let result

    switch (type) {
      case 'summary':
        result = await llmService.summarizeReadme(text)
        break
      case 'translate':
        result = await llmService.translateToKorean(text)
        break
      case 'bullets':
        const bullets = await llmService.extractBulletPoints(text, 4)
        result = { success: true, content: bullets.join('\n'), provider: 'llm' }
        break
      default:
        return res.status(400).json({
          success: false,
          error: 'Unknown summary type',
        })
    }

    res.json(result)
  } catch (error) {
    console.error('❌ Error summarizing:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

export default router
