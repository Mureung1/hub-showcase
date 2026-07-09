import { Router } from 'express';
import { generatePortfolio } from '../services/portfolioPipeline.js';

const router = Router();

const CLIENT_ERROR_CODES = new Set([
  'INVALID_URL',
  'REPOSITORY_NOT_FOUND',
  'JD_TOO_SHORT',
]);

router.post('/analyze', async (req, res) => {
  const { repositoryUrl, jdText } = req.body || {};

  try {
    const result = await generatePortfolio({ repositoryUrl, jdText });
    res.json({ success: true, data: result, error: null });
  } catch (err) {
    const code = err.code || 'INTERNAL_ERROR';
    const status = CLIENT_ERROR_CODES.has(code) ? 400 : 500;
    res.status(status).json({
      success: false,
      data: null,
      error: { code, message: err.message || '알 수 없는 오류가 발생했습니다.' },
    });
  }
});

export default router;
