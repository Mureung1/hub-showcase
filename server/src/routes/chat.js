import { Router } from 'express';
import { requireAuth } from '../services/auth/requireAuth.js';
import { detectWithRegex } from '../services/detectors/regexDetector.js';
import { getProvider } from '../providers/index.js';
import { AppError } from '../utils/errors.js';

const router = Router();

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      throw new AppError(400, 'invalid_request', 'prompt는 필수입니다.');
    }

    const { detections, maskedText } = detectWithRegex(prompt);
    const masked = detections.length > 0;

    const provider = getProvider();
    const content = await provider.sendMessage(maskedText);

    res.json({
      result: masked ? 'masked' : 'pass',
      content,
      detections,
      ...(masked && { masked_prompt: maskedText }),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
