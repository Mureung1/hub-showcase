import { Router } from 'express';
import { supabase } from '../db/supabaseClient.js';

const router = Router();

// POST /api/tide-checks — 슬라이더 값(valence, arousal) 저장
router.post('/', async (req, res) => {
  const { valence, arousal } = req.body;

  if (typeof valence !== 'number' || typeof arousal !== 'number') {
    return res.status(400).json({ error: 'valence, arousal은 숫자여야 합니다.' });
  }

  const { data, error } = await supabase
    .from('tide_checks')
    .insert({ valence, arousal })
    .select()
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.status(201).json(data);
});

// GET /api/tide-checks/latest — 가장 최근 값 조회
router.get('/latest', async (req, res) => {
  const { data, error } = await supabase
    .from('tide_checks')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  if (!data) {
    return res.status(404).json({ error: '저장된 tide check가 없습니다.' });
  }

  res.json(data);
});

export default router;
