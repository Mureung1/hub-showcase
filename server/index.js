import express from 'express'
import cors from 'cors'
import { listInterests, addInterest, removeInterest } from './store.js'

const app = express()
app.use(cors()) //           브라우저(다른 포트)에서 부를 수 있게 허용
app.use(express.json()) //    요청 body의 JSON을 req.body 로 파싱

// ── 라우트: 메서드 + 경로 → 핸들러 (Spring의 @GetMapping/@PostMapping과 동일) ──

// GET /api/interests — 관심 공고 목록 주기 (Read)
app.get('/api/interests', async (req, res) => {
  try {
    res.json(await listInterests()) // DB 응답을 기다렸다가 그대로 반환
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// POST /api/interests — 새 관심 공고 저장 (Create)
app.post('/api/interests', async (req, res) => {
  const { company, role, jd } = req.body ?? {}
  if (!company || !role) {
    return res.status(400).json({ error: 'company·role 은 필수입니다' })
  }
  try {
    const saved = await addInterest({ company, role, jd })
    res.status(201).json(saved) // 201 = 생성됨, 저장된 행을 응답으로
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// DELETE /api/interests/:id — 관심 공고 삭제 (Delete)
app.delete('/api/interests/:id', async (req, res) => {
  try {
    const ok = await removeInterest(req.params.id)
    if (!ok) return res.status(404).json({ error: '없는 id' })
    res.status(204).end() // 204 = 성공, 본문 없음
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

const PORT = 3000
app.listen(PORT, () => {
  console.log(`✅ API 서버: http://localhost:${PORT}`)
})
