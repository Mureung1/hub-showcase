import { Router } from 'express'
import { searchNaverShop } from '../lib/naverClient.js'

const router = Router()

router.get('/search', async (req, res) => {
  const { query } = req.query

  if (!query) {
    res.status(400).json({ error: 'query 파라미터가 필요합니다.' })
    return
  }

  try {
    const items = await searchNaverShop(query)
    res.status(200).json({ items })
  } catch (error) {
    if (error.status) {
      res.status(error.status).json({ error: error.message })
      return
    }
    res.status(502).json({ error: '네이버 API에 연결할 수 없습니다.' })
  }
})

export default router
