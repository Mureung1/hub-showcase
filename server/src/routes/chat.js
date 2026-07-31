import { Router } from 'express';
import { requireAuth } from '../services/auth/requireAuth.js';
import { chatRateLimit } from '../services/rateLimit/rateLimiter.js';
import { uploadFiles } from '../services/files/upload.js';
import { extractTextFromFile } from '../services/files/extractText.js';
import { detectWithRegex } from '../services/detectors/regexDetector.js';
import { getProvider } from '../providers/index.js';
import { AppError } from '../utils/errors.js';

const router = Router();

// 프롬프트와 첨부 파일 각각을 같은 정규식 탐지기에 태우고, 마스킹된 조각을 하나의
// 텍스트로 합친다. 탐지 결과에는 어느 조각에서 나왔는지(origin) 붙여 로그·표시에 쓴다.
function inspect({ prompt, files }) {
  const parts = [];
  if (prompt) parts.push({ origin: 'prompt', label: null, text: prompt });
  for (const file of files) {
    const { name, text } = extractTextFromFile(file);
    parts.push({ origin: `file:${name}`, label: name, text });
  }

  const detections = [];
  const maskedChunks = [];
  for (const part of parts) {
    const result = detectWithRegex(part.text);
    for (const d of result.detections) detections.push({ ...d, origin: part.origin });
    // 파일 조각은 어느 파일인지 라벨을 붙여 LLM에도 맥락을 준다.
    maskedChunks.push(part.label ? `[첨부 파일: ${part.label}]\n${result.maskedText}` : result.maskedText);
  }

  return { detections, maskedText: maskedChunks.join('\n\n') };
}

router.post('/', requireAuth, chatRateLimit, uploadFiles, async (req, res, next) => {
  try {
    const prompt = req.body.prompt?.trim();
    const files = req.files ?? [];

    if (!prompt && files.length === 0) {
      throw new AppError(400, 'invalid_request', 'prompt 또는 첨부 파일이 필요합니다.');
    }

    const { detections, maskedText } = inspect({ prompt, files });
    const masked = detections.length > 0;

    const provider = getProvider();
    const content = await provider.sendMessage(maskedText);

    res.json({
      result: masked ? 'masked' : 'pass',
      content,
      detections,
      files: files.map((f) => f.originalname),
      ...(masked && { masked_prompt: maskedText }),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
