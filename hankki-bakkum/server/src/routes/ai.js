import { Router } from 'express';
import { generateAdCopy } from '../services/llm.js';

const router = Router();

// POST /api/ai/ad-copy  { situation: "비 와서 손님 없는데 김치찌개 남았어요" }
router.post('/ad-copy', async (req, res) => {
  const { situation } = req.body;
  if (!situation || situation.trim().length < 2) {
    return res.status(400).json({ error: 'SITUATION_REQUIRED', message: '상황을 한 줄 적어주세요' });
  }
  try {
    const draft = await generateAdCopy(situation);
    res.json(draft);
  } catch (e) {
    res.status(502).json({ error: 'AI_FAILED', message: 'AI 문구 생성에 실패했어요. 다시 시도해주세요.' });
  }
});

export default router;
