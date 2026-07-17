const express = require('express')
const { aggregate } = require('./stats')
const postings = require('../data/backend-postings.sample.json')

const app = express()
const PORT = process.env.PORT || 4000

app.use(express.json())

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' })
})

// 1차 슬라이스: 통계 엔드포인트. 샘플 공고를 rule로 집계해 계약(4.2) 형태로 응답한다.
app.get('/api/stats', (req, res) => {
  const job = req.query.job
  if (job !== 'backend') {
    return res.status(400).json({
      job: job || null,
      error: { code: 'UNSUPPORTED_JOB', message: '현재는 backend 직무만 지원합니다' },
    })
  }
  res.json(aggregate(postings))
})

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})
