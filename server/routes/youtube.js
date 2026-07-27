import { Router } from 'express'
import { fetchYoutubeVideoDimensions } from '../lib/youtubeClient.js'

const router = Router()

router.get('/dimensions', async (req, res) => {
  const { videoId } = req.query

  if (!videoId) {
    res.status(400).json({ error: 'videoId 파라미터가 필요합니다.' })
    return
  }

  try {
    const data = await fetchYoutubeVideoDimensions(videoId)
    res.status(200).json(data)
  } catch (error) {
    if (error.status) {
      res.status(error.status).json({ error: error.message })
      return
    }
    res.status(502).json({ error: '유튜브 페이지에 연결할 수 없습니다.' })
  }
})

export default router
