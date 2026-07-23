import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import supabase from './utils/supabaseClient.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const mockDataPath = path.join(__dirname, 'mock/curationResponse.json');
const mockData = JSON.parse(fs.readFileSync(mockDataPath, 'utf8'));

// 환경 변수 로드
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// 미들웨어 설정
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- TypeScript Interfaces ---
export interface DbPaper {
  user_id: string | null;
  paper_id: string;
  title: string;
  authors: string;
  channel: string;
  year: number;
  match_score: number;
  created_at: string;
}

export interface PaperPayload {
  paperId: string;
  title: string;
  authors: string;
  channel: string;
  year: number;
  matchScore: number;
  userId: string;
}

export interface LibraryItem {
  userId: string;
  paperId: string;
  title: string;
  authors: string;
  channel: string;
  year: number;
  matchScore: number;
  createdAt: string;
}

// 시니어 피드백: mapToCamelCase 헬퍼 함수의 오버로딩 구현
export function mapToCamelCase(dbPaper: DbPaper): LibraryItem;
export function mapToCamelCase(dbPaper: DbPaper[]): LibraryItem[];
export function mapToCamelCase(dbPaper: DbPaper | DbPaper[]): LibraryItem | LibraryItem[] | null {
  if (!dbPaper) return null;
  if (Array.isArray(dbPaper)) {
    return dbPaper.map(item => ({
      userId: item.user_id || '',
      paperId: item.paper_id,
      title: item.title,
      authors: item.authors,
      channel: item.channel,
      year: item.year,
      matchScore: item.match_score,
      createdAt: item.created_at
    }));
  }
  return {
    userId: dbPaper.user_id || '',
    paperId: dbPaper.paper_id,
    title: dbPaper.title,
    authors: dbPaper.authors,
    channel: dbPaper.channel,
    year: dbPaper.year,
    matchScore: dbPaper.match_score,
    createdAt: dbPaper.created_at
  };
}

import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { z } from 'zod';

interface S2RawPaper {
  paperId: string;
  title: string;
  authors: string[];
  abstract: string;
  year: number;
  citationCount?: number;
}

// S2 API 논문 수집 유틸리티 함수
async function fetchS2Papers(searchKeyword: string, limit: number = 50): Promise<S2RawPaper[]> {
  const apiKey = process.env.SEMANTIC_SCHOLAR_API_KEY;
  const encodedQuery = encodeURIComponent(searchKeyword);
  const fields = 'paperId,title,authors,abstract,year,citationCount';
  const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodedQuery}&fields=${fields}&year=2025-2026&sort=citationCount:desc&limit=${limit}`;

  const headers: Record<string, string> = {
    'User-Agent': 'ScholarFinder-Agent/1.0 (academic-research-tool)'
  };
  if (apiKey) {
    headers['x-api-key'] = apiKey;
  }

  let fetchResponse: any = null;
  let attempts = 0;

  while (attempts < 5) {
    try {
      attempts++;
      fetchResponse = await fetch(url, { headers });
      if (fetchResponse.status === 429) {
        console.warn(`⚠️ [S2 API 429 Limit] IP Cooldown 대기 중... (3.5초 대기, 시도 ${attempts}/5)`);
        await new Promise(r => setTimeout(r, 3500));
        continue;
      }
      if (fetchResponse.ok) break;
    } catch (err) {
      if (attempts >= 5) throw err;
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  if (!fetchResponse || !fetchResponse.ok) {
    throw new Error(`Semantic Scholar API Error: ${fetchResponse ? fetchResponse.status : 'No Response'}`);
  }

  const data = await fetchResponse.json() as { data?: any[] };
  const rawList = data.data || [];

  return rawList.map((item: any, idx: number) => {
    const paperId = item.paperId || `s2-${idx + 1}`;
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
}

// --- Zod Validation Schemas ---
const curateSchema = z.object({
  major: z.string().trim().optional().default('computer science AI'),
  keywords: z.array(z.string().trim()).optional().default([]),
  query: z.string().trim().min(2, { message: "연구 질문(Query)은 최소 2글자 이상 입력해야 합니다." })
});

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
  })).min(0).max(5)
});

const librarySchema = z.object({
  paper: z.object({
    paperId: z.string().trim().min(1, { message: "paperId는 필수값입니다." }),
    title: z.string().trim().min(1, { message: "논문 제목은 필수값입니다." }),
    authors: z.string().trim().min(1, { message: "저자 정보는 필수값입니다." }),
    channel: z.string().trim().min(1, { message: "학술 채널은 필수값입니다." }),
    year: z.number().int().min(1900).max(new Date().getFullYear() + 1, { message: "올바른 발행 연도가 아닙니다." }),
    matchScore: z.number().int().min(0).max(100, { message: "매칭 스코어는 0에서 100 사이여야 합니다." }),
    userId: z.string().trim().min(1, { message: "유효한 형식의 userId가 필요합니다." }) // 시니어 피드백: uuid() 제약 제거
  })
});

// 서버 동작 확인용 기본 루트 엔드포인트
app.get('/', (req: Request, res: Response) => {
  res.json({
    status: 'success',
    message: 'Scholar-Sync AI Backend Server is running successfully!',
    timestamp: new Date().toISOString()
  });
});

// POST /api/curate - 지능형 논문 큐레이션 및 에이전트 분석 수행 (S2 + Gemini 3.5 Flash Lite RAG)
app.post('/api/curate', async (req: Request, res: Response) => {
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

    const { major, keywords, query } = validationResult.data;
    console.log(`📥 [POST /api/curate] RAG 요청 수신 | Major: "${major}" | Keywords: [${keywords.join(', ')}] | Query: "${query}"`);

    // 1. S2 동적 수집 (N=50)
    const searchKeyword = `${major || 'computer science AI'} ${Array.isArray(keywords) ? keywords.join(' ') : ''}`.trim();
    const papers = await fetchS2Papers(searchKeyword, 50);

    // 2. Gemini 3.5 Flash Lite 개인화 RAG 평가
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('❌ GEMINI_API_KEY가 환경변수에 설정되어 있지 않습니다.');
      return res.status(500).json({
        status: 'error',
        message: '서버 내부 AI 인프라 설정 오류로 인해 요청을 처리할 수 없습니다.'
      });
    }

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

[사용자의 현재 연구 질문]
"${query}"

[큐레이션 및 선별 원칙]
1. 최우선 연관성 필터링 (Relevance Filtering): OVG 기준을 평가하기에 앞서, 수집된 50편의 논문 중 사용자의 현재 연구 질문("${query}")을 해결하는 데 직접적으로 연관된(Relevant) 논문인지 최우선으로 필터링하라.
2. OVG 3대 학술 평가 (Originality, Validity, Generalizability): 연관성이 확보된 후보군 중 OVG 점수가 가장 뛰어난 논문(최대 5편)을 최종 선별하라.
3. XAI 근거 및 인사이트 작성: 선별된 논문들에 대하여 왜 사용자의 질문에 부합하는지 reasoning과 insights(background, coreMethod, quantitativeResult)를 한국어로 명확히 기술하라.
4. 예외 수량 반환 지침: 만약 수집된 50편의 논문 중 사용자의 질문과 직접적으로 연관된 논문이 5편 미만이라면, 억지로 5편을 채우지 말고 연관성이 확실히 검증된 논문(예: 1~4편)만 선별하여 반환하라. 연관된 논문이 아예 없다면 빈 배열([])을 반환해도 좋다.
`;

    const model = genAI.getGenerativeModel({
      model: 'gemini-3.5-flash-lite',
      systemInstruction,
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: responseSchema as any
      }
    });

    const promptInput = JSON.stringify(papers, null, 2);
    const result = await model.generateContent(promptInput);
    const responseText = (await result.response).text() || '';

    // 3. Zod 정합성 검증
    const jsonParsed = JSON.parse(responseText);
    const validated = benchmarkZodSchema.parse(jsonParsed);

    console.log(`✅ [POST /api/curate Success] 개인화 논문 큐레이션 성공! (선별 논문: ${validated.papers.length}편)`);
    return res.status(200).json({
      status: 'success',
      data: {
        papers: validated.papers
      }
    });

  } catch (error: any) {
    // 정보 유출 차단: 서버 콘솔에는 원본 에러 출력, 프론트엔드에는 정제된 메시지만 반환
    console.error('❌ [POST /api/curate Error]:', error.stack || error.message || error);
    return res.status(500).json({
      status: 'error',
      message: '논문 큐레이션 및 AI 분석 처리 중 내부 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.'
    });
  }
});

// POST /api/library - 연구 논문 서재 보관 처리
app.post('/api/library', async (req: Request, res: Response) => {
  try {
    const validationResult = librarySchema.safeParse(req.body);
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

    const { paper } = validationResult.data;

    if (!supabase) {
      throw new Error('Supabase client is not initialized. Please configure env variables.');
    }

    const { data, error } = await supabase
      .from('saved_papers')
      .insert([
        {
          paper_id: paper.paperId,
          title: paper.title,
          authors: paper.authors,
          channel: paper.channel,
          year: paper.year,
          match_score: paper.matchScore,
          user_id: paper.userId
        }
      ])
      .select();

    if (error) {
      throw error;
    }

    const formattedPaper = mapToCamelCase(data?.[0] as DbPaper);
    res.status(201).json({ status: 'success', data: formattedPaper });
  } catch (error: any) {
    console.error('❌ Library insert error:', error.message || error);
    res.status(500).json({ status: 'error', message: error.message || 'Internal server error.' });
  }
});

// GET /api/library/:userId - 특정 사용자의 서재 목록 조회 (RESTful)
app.get('/api/library/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ status: 'error', message: 'User ID is required.' });
    }

    if (!supabase) {
      throw new Error('Supabase client is not initialized.');
    }

    const { data, error } = await supabase
      .from('saved_papers')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      throw error;
    }

    // 시니어 피드백: 오버로딩된 mapToCamelCase를 사용해 배열을 바로 넘겨 가독성과 효율 극대화
    const formattedPapers = mapToCamelCase(data as DbPaper[]);
    res.json({ status: 'success', data: formattedPapers });
  } catch (error: any) {
    console.error('❌ Library select error:', error.message || error);
    res.status(500).json({ status: 'error', message: error.message || 'Internal server error.' });
  }
});

// DELETE /api/library/:userId/:paperId - 특정 사용자의 특정 논문 서재 삭제 (RESTful)
app.delete('/api/library/:userId/:paperId', async (req: Request, res: Response) => {
  try {
    const { userId, paperId } = req.params;
    if (!userId || !paperId) {
      return res.status(400).json({ status: 'error', message: 'User ID and Paper ID are required.' });
    }

    if (!supabase) {
      throw new Error('Supabase client is not initialized.');
    }

    const { error } = await supabase
      .from('saved_papers')
      .delete()
      .eq('user_id', userId)
      .eq('paper_id', paperId);

    if (error) {
      throw error;
    }

    res.json({ status: 'success', message: 'Paper deleted successfully.' });
  } catch (error: any) {
    console.error('❌ Library delete error:', error.message || error);
    res.status(500).json({ status: 'error', message: error.message || 'Internal server error.' });
  }
});

// 서버 포트 리스닝
app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(` Scholar-Sync AI Server is running on port ${PORT}`);
  console.log(` Health Check: http://localhost:${PORT}/`);
  console.log(`==================================================`);
});

export default app;
