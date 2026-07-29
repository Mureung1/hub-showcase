import { GoogleGenerativeAI } from '@google/generative-ai';
import { CurateInput, CuratedPaper, QueryTransformResult, S2RawPaper } from '../types/curate.types.js';
import { queryTransformSystemInstruction, queryTransformResponseSchema } from '../prompts/queryTransform.prompt.js';
import { buildCurateRAGSystemInstruction, curateRAGResponseSchema } from '../prompts/curateRAG.prompt.js';
import { queryTransformZodSchema, benchmarkZodSchema } from '../schemas/curate.schema.js';

// Helper for Gemini exponential backoff retry
async function callGeminiWithBackoff<T>(fn: () => Promise<T>, maxRetries: number = 3): Promise<T> {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      attempt++;
      return await fn();
    } catch (err: any) {
      const isRateLimit = err.status === 429 || err.statusCode === 429 || (err.message && err.message.includes('429')) || (err.message && err.message.includes('RESOURCE_EXHAUSTED'));
      if (isRateLimit && attempt < maxRetries) {
        const backoffMs = Math.min(2000 * Math.pow(2, attempt - 1), 10000) + Math.floor(Math.random() * 500);
        console.warn(`⚠️ [Gemini Rate Limit (15 RPM)] 429 감지됨. 백오프 대기 중... (${(backoffMs / 1000).toFixed(1)}초, 시도 ${attempt}/${maxRetries})`);
        await new Promise(r => setTimeout(r, backoffMs));
        continue;
      }
      throw err;
    }
  }
  throw new Error('Gemini API maximum retries reached.');
}

/**
 * Phase 1: Query Transformation
 * Translates natural language user input (major, keywords, query) into an optimized English academic search query for S2 API.
 */
export async function transformQuery(input: CurateInput): Promise<QueryTransformResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY_MISSING');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const modelName = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';

  try {
    return await callGeminiWithBackoff(async () => {
      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: queryTransformSystemInstruction,
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: queryTransformResponseSchema as any
        }
      });

      const promptInput = JSON.stringify({
        major: input.major,
        keywords: input.keywords,
        query: input.query
      });

      const result = await model.generateContent(promptInput);
      const responseText = (await result.response).text() || '';
      const parsed = JSON.parse(responseText);
      const validated = queryTransformZodSchema.parse(parsed);

      console.log(`✨ [Phase 1 Query Transformation] 변환 성공: "${input.query}" ➔ "${validated.searchKeyword}"`);
      return validated;
    });
  } catch (err: any) {
    console.warn(`⚠️ [Phase 1 Query Transformation Fallback] Gemini 호출 실패, 기본 학술 키워드 조합으로 폴백합니다. Error: ${err.message}`);
    // Safe Fallback: Extract English terms / combine major & keywords & query
    const cleanedQuery = input.query.replace(/[^a-zA-Z0-9\s]/g, ' ').trim();
    const fallbackKeyword = `${input.major} ${input.keywords.join(' ')} ${cleanedQuery}`.trim();
    return {
      searchKeyword: fallbackKeyword || 'computer science AI',
      reasoning: 'Fallback query generated due to Phase 1 transformation rate limit or error.'
    };
  }
}

/**
 * Phase 2: RAG & OVG Evaluation
 * Evaluates candidates from S2 with Context Retention (re-injecting major, keywords, original query).
 */
export async function evaluatePapersWithRAG(papers: S2RawPaper[], input: CurateInput): Promise<CuratedPaper[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY_MISSING');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const modelName = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
  const systemInstruction = buildCurateRAGSystemInstruction(input.major, input.keywords, input.query, input.lang);

  return await callGeminiWithBackoff(async () => {
    const model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction,
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: curateRAGResponseSchema as any
      }
    });

    const promptPayload = {
      userContext: {
        major: input.major,
        keywords: input.keywords,
        originalQuery: input.query
      },
      candidatePapers: papers
    };

    const result = await model.generateContent(JSON.stringify(promptPayload, null, 2));
    const responseText = (await result.response).text() || '';
    const jsonParsed = JSON.parse(responseText);
    const validated = benchmarkZodSchema.parse(jsonParsed);

    console.log(`✅ [Phase 2 RAG Evaluation Success] 논문 큐레이션 완료! (선별 논문: ${validated.papers.length}편)`);
    return validated.papers as CuratedPaper[];
  });
}
