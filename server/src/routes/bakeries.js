import { Router } from 'express';
import { db } from '../db/index.js';

const router = Router();

// TODO(목요일 Task): 실제 데이터 입력 후 필터/정렬 쿼리 파라미터 추가
router.get('/bakeries', async (req, res, next) => {
  try {
    const { rows } = await db.query('SELECT * FROM bakeries');
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
});

export default router;
