import dotenv from 'dotenv';
import { XMLParser } from 'fast-xml-parser';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { z } from 'zod';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// .env 로드 (server 루트 및 최상위 경로 탐색)
dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config({ path: path.join(__dirname, '../../.env') });

interface ArxivRawPaper {
  paperId: string;
  title: string;
  authors: string[];
  summary: string;
  publishedYear: number;
}

// --- 1. Zod Verification Schema ---
const benchmarkZodSchema = z.object({
  papers: z.array(z.object({
    paperId: z.string().min(1),
    title: z.string().min(1),
    authors: z.array(z.string().min(1)).min(1),
    channel: z.string().min(1),
    year: z.number().int().min(1900),
    matchScore: z.number().int().min(0).max(100),
    ovgBreakdown: z.object({
      originality: z.number().int().min(0).max(100),
      validity: z.number().int().min(0).max(100),
      generalizability: z.number().int().min(0).max(100)
    }),
    reasoning: z.string().min(1),
    insights: z.object({
      background: z.string().min(1),
      coreMethod: z.string().min(1),
      quantitativeResult: z.string().min(1)
    })
  })).length(5)
});

// --- 2. arXiv XML 수집 및 fast-xml-parser 파싱 함수 ---
async function fetchArxivPapers(): Promise<ArxivRawPaper[]> {
  console.log('📡 [1/4] arXiv API 수집 시작 (카테고리: cs.AI OR cs.LG, 최신 30편)...');
  
  const arxivUrl = 'http://export.arxiv.org/api/query?search_query=cat:cs.AI+OR+cat:cs.LG&sortBy=submittedDate&sortOrder=descending&max_results=30';
  const response = await fetch(arxivUrl);
  
  if (!response.ok) {
    throw new Error(`arXiv API fetch error: ${response.statusText}`);
  }

  const xmlData = await response.text();
  
  // fast-xml-parser 안전 객체 변환
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_'
  });

  const parsed = parser.parse(xmlData);
  const entries = parsed.feed?.entry || [];
  
  const papers: ArxivRawPaper[] = (Array.isArray(entries) ? entries : [entries]).map((entry: any, index: number) => {
    const rawId = entry.id ? String(entry.id).split('/abs/').pop() || `arxiv-${index + 1}` : `arxiv-${index + 1}`;
    const title = entry.title ? String(entry.title).replace(/\s+/g, ' ').trim() : 'Untitled Paper';
    
    let authorsList: string[] = [];
    if (entry.author) {
      if (Array.isArray(entry.author)) {
        authorsList = entry.author.map((a: any) => String(a.name || '').trim()).filter(Boolean);
      } else if (entry.author.name) {
        authorsList = [String(entry.author.name).trim()];
      }
    }
    if (authorsList.length === 0) authorsList = ['Unknown Author'];

    const summary = entry.summary ? String(entry.summary).replace(/\s+/g, ' ').trim() : 'No abstract available.';
    const publishedYear = entry.published ? new Date(entry.published).getFullYear() : new Date().getFullYear();

    return {
      paperId: rawId,
      title,
      authors: authorsList,
      summary,
      publishedYear
    };
  });

  console.log(`✅ [1/4] arXiv 30편 파싱 성공! (수집된 논문 수: ${papers.length}편)`);
  return papers;
}

// --- 3. Gemini 3.5 Flash Lite PoC & Latency/Token 측정 ---
async function runGeminiBenchmark() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('❌ Error: GEMINI_API_KEY is not defined in environment variables.');
    process.exit(1);
  }

  const papers = await fetchArxivPapers();
  console.log('🧠 [2/4] Gemini 3.5 Flash Lite RAG 평가 요청 준비...');

  const genAI = new GoogleGenerativeAI(apiKey);

  const responseSchema = {
    type: SchemaType.OBJECT,
    properties: {
      papers: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.OBJECT,
          properties: {
            paperId: { type: SchemaType.STRING },
            title: { type: SchemaType.STRING },
            authors: {
              type: SchemaType.ARRAY,
              items: { type: SchemaType.STRING }
            },
            channel: { type: SchemaType.STRING },
            year: { type: SchemaType.INTEGER },
            matchScore: { type: SchemaType.INTEGER },
            ovgBreakdown: {
              type: SchemaType.OBJECT,
              properties: {
                originality: { type: SchemaType.INTEGER },
                validity: { type: SchemaType.INTEGER },
                generalizability: { type: SchemaType.INTEGER }
              },
              required: ['originality', 'validity', 'generalizability']
            },
            reasoning: { type: SchemaType.STRING },
            insights: {
              type: SchemaType.OBJECT,
              properties: {
                background: { type: SchemaType.STRING },
                coreMethod: { type: SchemaType.STRING },
                quantitativeResult: { type: SchemaType.STRING }
              },
              required: ['background', 'coreMethod', 'quantitativeResult']
            }
          },
          required: ['paperId', 'title', 'authors', 'channel', 'year', 'matchScore', 'ovgBreakdown', 'reasoning', 'insights']
        }
      }
    },
    required: ['papers']
  };

  const systemInstruction = `
너는 최고 수준의 인공지능(AI/ML) 연구 큐레이션 에이전트이다.
주어진 30편의 최신 arXiv 논문 초록(Abstract) 데이터를 바탕으로, OVG 3대 학술 평가 기준에 따라 가장 우수한 상위 5편을 선별하라.

[OVG 평가 기준]
1. Originality (독창성, 0~100): 기존 연구 한계를 극복하는 핵심 아이디어의 참신성.
2. Validity (타당성, 0~100): 방법론의 논리적 완결성 및 실험/수치적 결과의 신뢰도.
3. Generalizability (일반화 가능성, 0~100): 타 도메인이나 학문 분야로 확장 및 적용할 수 있는 보편성.

[요구사항]
- matchScore는 OVG 점수의 종합 평가 스코어(0~100)로 결정하라.
- channel은 'arXiv' 또는 적절한 대표 카테고리로 지정하라.
- reasoning 필드에는 이 논문이 상위 5편으로 선별된 이유를 2문장 이내의 정교한 학술 한국어로 기술하라.
- insights 객체 내 background, coreMethod, quantitativeResult는 각각 1문장 내외의 한국어 핵심 요약으로 작성하라.
- 반드시 정확히 5편의 논문을 선정하여 선별하라.
`;

  // 최신 gemini-3.5-flash-lite 모델 지정
  const model = genAI.getGenerativeModel({
    model: 'gemini-3.5-flash-lite',
    systemInstruction,
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema
    }
  });

  const promptInput = JSON.stringify(papers, null, 2);

  console.log('🚀 [3/4] Gemini 3.5 Flash Lite 평가 호출 송신 중 (Fail-Fast 모드)...');
  const startTime = performance.now();

  let responseText = '';
  let usage: any = null;

  try {
    const result = await model.generateContent(promptInput);
    const response = await result.response;
    responseText = response.text() || '';
    usage = response.usageMetadata;
  } catch (err: any) {
    console.error('❌ [Fail-Fast] Gemini API 호출 중 에러 발생:', err.message || err);
    process.exit(1);
  }

  const endTime = performance.now();
  const latencySec = ((endTime - startTime) / 1000).toFixed(2);

  console.log('📥 [3/4] Gemini 응답 수신 완료!');
  console.log(`⏱️ [Latency] 응답 지연 시간: ${latencySec}초`);

  if (usage) {
    console.log(`📊 [Token Usage] Prompt Tokens: ${usage.promptTokenCount || 0} | Output Tokens: ${usage.candidatesTokenCount || 0} | Total Tokens: ${usage.totalTokenCount || 0}`);
  } else {
    console.log('📊 [Token Usage] Usage metadata is not available.');
  }

  // --- 4. Zod Schema 파싱 및 정합성 검증 ---
  console.log('🧪 [4/4] 반환된 JSON 정합성 검증 (Zod Schema Validation)...');
  
  let jsonParsed: any;
  try {
    jsonParsed = JSON.parse(responseText);
  } catch (parseError) {
    console.error('❌ JSON Parsing Error:', parseError);
    process.exit(1);
  }

  const validationResult = benchmarkZodSchema.safeParse(jsonParsed);

  if (!validationResult.success) {
    console.error('❌ [Fail] Zod Schema Validation Failed!');
    console.error(JSON.stringify(validationResult.error.issues, null, 2));
    process.exit(1);
  }

  console.log('✅ [Success] Zod Schema Validation Passed!');
  console.log('\n==================================================');
  console.log('🏆 큐레이션 선별 상위 5편 논문 결과 (OVG 스코어 & 인사이트)');
  console.log('==================================================');

  validationResult.data.papers.forEach((paper, idx) => {
    console.log(`\n[${idx + 1}] ${paper.title} (${paper.year})`);
    console.log(`- Paper ID: ${paper.paperId}`);
    console.log(`- Authors: ${paper.authors.join(', ')}`);
    console.log(`- Match Score: ${paper.matchScore}% (Originality: ${paper.ovgBreakdown.originality}, Validity: ${paper.ovgBreakdown.validity}, Generalizability: ${paper.ovgBreakdown.generalizability})`);
    console.log(`- Selection Reasoning: ${paper.reasoning}`);
    console.log(`- Insights Background: ${paper.insights.background}`);
    console.log(`- Insights Core Method: ${paper.insights.coreMethod}`);
    console.log(`- Insights Result: ${paper.insights.quantitativeResult}`);
  });

  console.log('\n==================================================');
  console.log(`🎉 벤치마크 테스트 완수! Latency: ${latencySec}s`);
  console.log('==================================================');
}

runGeminiBenchmark().catch((err) => {
  console.error('❌ Benchmark execution error:', err);
  process.exit(1);
});
