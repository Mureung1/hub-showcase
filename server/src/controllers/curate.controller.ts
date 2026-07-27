import { Request, Response } from 'express';
import { curateSchema } from '../schemas/curate.schema.js';
import { transformQuery, evaluatePapersWithRAG } from '../services/gemini.service.js';
import { fetchS2Papers } from '../services/s2.service.js';

export async function curatePapersController(req: Request, res: Response) {
  try {
    const validationResult = curateSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        status: 'error',
        message: '요청 데이터의 유효성 검증에 실패했습니다.',
        errors: validationResult.error.issues.map(issue => ({
          field: issue.path.join('.'),
          message: issue.message
        }))
      });
    }

    const curateInput = validationResult.data;
    console.log(`📥 [POST /api/curate] RAG 요청 수신 | Major: "${curateInput.major}" | Keywords: [${curateInput.keywords.join(', ')}] | Query: "${curateInput.query}"`);

    // Phase 1: Query Transformation (TSK-019)
    const { searchKeyword } = await transformQuery(curateInput);

    // Dynamic S2 Fetch with env configuration
    const s2Limit = parseInt(process.env.MAX_S2_CANDIDATES || '50', 10);
    const rawPapers = await fetchS2Papers(searchKeyword, s2Limit);

    // Phase 2: RAG & OVG Evaluation with Context Retention (TSK-012)
    const curatedPapers = await evaluatePapersWithRAG(rawPapers, curateInput);

    return res.status(200).json({
      status: 'success',
      data: {
        papers: curatedPapers
      }
    });

  } catch (error: any) {
    console.error('❌ [POST /api/curate Error]:', error.stack || error.message || error);
    if (error.message === 'GEMINI_API_KEY_MISSING') {
      return res.status(500).json({
        status: 'error',
        message: '서버 내부 AI 인프라 설정 오류로 인해 요청을 처리할 수 없습니다.'
      });
    }
    if (error.message === 'S2_RATE_LIMIT_EXCEEDED' || error.statusCode === 429 || error.status === 429) {
      return res.status(429).json({
        status: 'error',
        code: 'RATE_LIMIT_EXCEEDED',
        message: '학술 데이터베이스 API 요청 한도를 초과했습니다. 잠시 후 다시 시도해 주세요.'
      });
    }
    return res.status(500).json({
      status: 'error',
      message: '논문 큐레이션 및 AI 분석 처리 중 내부 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.'
    });
  }
}
