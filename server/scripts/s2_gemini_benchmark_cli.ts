import dotenv from 'dotenv';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { z } from 'zod';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// .env 로드 (server/ 및 최상위 루트 탐색)
dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config({ path: path.join(__dirname, '../../.env') });

interface S2RawPaper {
  paperId: string;
  title: string;
  authors: string[];
  abstract: string;
  year: number;
  citationCount?: number;
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

// --- 2. S2 API 페이징 & 이중 429 방어막(Proactive + Reactive) 수집 모듈 ---
async function fetchS2Papers(targetN: number): Promise<S2RawPaper[]> {
  const apiKey = process.env.SEMANTIC_SCHOLAR_API_KEY;
  if (!apiKey) {
    throw new Error('❌ [Fail-Fast] SEMANTIC_SCHOLAR_API_KEY가 .env 파일에 설정되어 있지 않습니다. 무의미한 퍼블릭 호출 및 IP 밴 방지를 위해 즉시 종료합니다.');
  }

  const allPapers: S2RawPaper[] = [];
  let offset = 0;
  const chunkSize = 100; // S2 API 1회 최대 청크 한도

  console.log(`📡 [S2 API Paging] 총 ${targetN}편 목표 수집 시작 (Chunk Size: 100, Trending: citationCount:desc)...`);

  while (allPapers.length < targetN) {
    const currentLimit = Math.min(chunkSize, targetN - allPapers.length);
    const searchQuery = encodeURIComponent('computer science AI');
    const fields = 'paperId,title,authors,abstract,year,citationCount';
    const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${searchQuery}&fields=${fields}&year=2025-2026&sort=citationCount:desc&offset=${offset}&limit=${currentLimit}`;

    const headers: Record<string, string> = {
      'User-Agent': 'ScholarFinder-Agent/1.0 (academic-research-tool)',
      'x-api-key': apiKey
    };

    console.log(`  ➡️ [Chunk Fetch] Offset: ${offset}, Limit: ${currentLimit} 요청 중...`);

    // Reactive 429 방어막 (최대 8회 백오프 재시도)
    let response: Response | null = null;
    let attempts = 0;

    while (attempts < 8) {
      try {
        attempts++;
        response = await fetch(url, { headers });
        if (response.status === 429) {
          console.warn(`  ⚠️ [S2 API 429 Limit] IP Cooldown 대기 중... (5초 대기, 시도 ${attempts}/8)`);
          await new Promise(r => setTimeout(r, 5000));
          continue;
        }
        if (response.ok) break;
      } catch (err) {
        if (attempts >= 8) throw err;
        await new Promise(r => setTimeout(r, 3000));
      }
    }

    if (!response || !response.ok) {
      throw new Error(`S2 API Paging Error: ${response ? `${response.status} ${response.statusText}` : 'No Response'}`);
    }

    const data = await response.json() as { data?: any[] };
    const rawList = data.data || [];

    if (rawList.length === 0) {
      console.warn('  ⚠️ 더 이상 가져올 수 있는 S2 논문 데이터가 없어 수집을 조기 종료합니다.');
      break;
    }

    // 명시적 데이터 매핑
    const chunkPapers: S2RawPaper[] = rawList.map((item: any, idx: number) => {
      const paperId = item.paperId || `s2-chunk-${offset + idx + 1}`;
      const title = item.title ? String(item.title).replace(/\s+/g, ' ').trim() : 'Untitled Paper';
      
      let authorsList: string[] = [];
      if (Array.isArray(item.authors)) {
        authorsList = item.authors.map((a: any) => String(a.name || '').trim()).filter(Boolean);
      }
      if (authorsList.length === 0) authorsList = ['Unknown Author'];

      const abstract = item.abstract ? String(item.abstract).replace(/\s+/g, ' ').trim() : 'No abstract provided.';
      const year = typeof item.year === 'number' ? item.year : 2025;
      const citationCount = typeof item.citationCount === 'number' ? item.citationCount : 0;

      return {
        paperId,
        title,
        authors: authorsList,
        abstract,
        year,
        citationCount
      };
    });

    allPapers.push(...chunkPapers);
    offset += rawList.length;

    console.log(`  ✅ [Chunk 완료] 현재 수집 누적: ${allPapers.length} / ${targetN}편`);

    // Proactive 429 방어막 (다음 청크 요청 전 3.5초 쿨다운 대기)
    if (allPapers.length < targetN && rawList.length === currentLimit) {
      console.log('  ⏳ [Proactive Cooldown] IP Rate Limit 예방을 위해 다음 청크 전 3.5초 대기 중...');
      await new Promise(r => setTimeout(r, 3500));
    }
  }

  console.log(`🎉 [S2 수집 완수] 총 ${allPapers.length}편 논문 데이터 수집 성공!`);
  return allPapers;
}

// --- 3. Single-shot Gemini 3.5 Flash Lite RAG 평가 및 지표 리포팅 ---
async function runSingleShotBenchmark() {
  // CLI 인자 동적 파싱
  const args = process.argv.slice(2);
  const targetN = args[0] ? parseInt(args[0], 10) : 50;

  if (isNaN(targetN) || targetN <= 0) {
    console.error('❌ 유효하지 않은 N값입니다. 예: npx tsx server/scripts/s2_gemini_benchmark_cli.ts 150');
    process.exit(1);
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('❌ Error: GEMINI_API_KEY is not defined in environment variables.');
    process.exit(1);
  }

  console.log(`\n==================================================`);
  console.log(`🚀 [Single-shot CLI Benchmark] N = ${targetN}편 단일 타격 평가`);
  console.log(`==================================================`);

  // 1. S2 Paging & Dual Protection 수집
  const papers = await fetchS2Papers(targetN);

  // 2. Gemini 3.5 Flash Lite RAG Top 5 선별 (Fail-Fast)
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
주어진 ${papers.length}편의 최신 Semantic Scholar 트렌딩 논문 초록(Abstract) 데이터를 바탕으로, OVG 3대 학술 평가 기준에 따라 가장 우수한 상위 5편을 선별하라.

[OVG 평가 기준]
1. Originality (독창성, 0~100): 기존 연구 한계를 극복하는 핵심 아이디어의 참신성.
2. Validity (타당성, 0~100): 방법론의 논리적 완결성 및 실험/수치적 결과의 신뢰도.
3. Generalizability (일반화 가능성, 0~100): 타 도메인이나 학문 분야로 확장 및 적용할 수 있는 보편성.

[요구사항]
- matchScore는 OVG 점수의 종합 평가 스코어(0~100)로 결정하라.
- channel은 'Semantic Scholar' 또는 대표 저널/학회명으로 지정하라.
- reasoning 필드에는 이 논문이 상위 5편으로 선별된 이유를 2문장 이내의 정교한 학술 한국어로 기술하라.
- insights 객체 내 background, coreMethod, quantitativeResult는 각각 1문장 내외의 한국어 핵심 요약으로 작성하라.
- 반드시 정확히 5편의 논문을 선정하여 선별하라.
`;

  const model = genAI.getGenerativeModel({
    model: 'gemini-3.5-flash-lite',
    systemInstruction,
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema
    }
  });

  const promptInput = JSON.stringify(papers, null, 2);

  console.log(`\n🧠 [Gemini 3.5 Flash Lite] N=${papers.length} RAG 큐레이션 요청 송신 중 (Fail-Fast 모드)...`);
  const startTime = performance.now();

  let responseText = '';
  let usage: any = null;

  try {
    const result = await model.generateContent(promptInput);
    const response = await result.response;
    responseText = response.text() || '';
    usage = response.usageMetadata;
  } catch (err: any) {
    console.error(`❌ [Fail-Fast] Gemini API 호출 중 에러 발생:`, err.message || err);
    process.exit(1);
  }

  const endTime = performance.now();
  const latencySec = ((endTime - startTime) / 1000).toFixed(2);

  console.log(`📥 [Gemini 응답 완료] 지연 시간(Latency): ${latencySec}초`);
  if (usage) {
    console.log(`📊 [Token Usage] Prompt: ${usage.promptTokenCount?.toLocaleString() || 0} | Output: ${usage.candidatesTokenCount?.toLocaleString() || 0} | Total: ${usage.totalTokenCount?.toLocaleString() || 0}`);
  }

  // 3. Zod Schema Validation
  console.log(`🧪 [Zod 검증] N=${papers.length} JSON Schema Validation...`);
  const jsonParsed = JSON.parse(responseText);
  const validated = benchmarkZodSchema.parse(jsonParsed);

  console.log(`✅ [Zod Success] Zod Schema Validation Passed! (선별 논문: ${validated.papers.length}편)\n`);

  console.log('==================================================');
  console.log(`🏆 N=${papers.length} 큐레이션 선별 상위 5편 결과`);
  console.log('==================================================');

  validated.papers.forEach((paper, idx) => {
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
  console.log(`🎉 Single-shot CLI 벤치마크 완수! Latency: ${latencySec}s | Total Tokens: ${usage?.totalTokenCount?.toLocaleString() || 0}`);
  console.log('==================================================\n');
}

runSingleShotBenchmark().catch((err) => {
  console.error('❌ Single-shot Benchmark Execution Error:', err);
  process.exit(1);
});
