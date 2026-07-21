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
  id: string;
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
  id: string;
  title: string;
  authors: string;
  channel: string;
  year: number;
  matchScore: number;
  userId: string;
}

export interface LibraryItem {
  id: string;
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
      id: item.id,
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
    id: dbPaper.id,
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

// 서버 동작 확인용 기본 루트 엔드포인트
app.get('/', (req: Request, res: Response) => {
  res.json({
    status: 'success',
    message: 'Scholar-Sync AI Backend Server is running successfully!',
    timestamp: new Date().toISOString()
  });
});

// POST /api/curate - 지능형 논문 큐레이션 및 에이전트 분석 수행 (Mock)
app.post('/api/curate', (req: Request, res: Response) => {
  console.log("📥 수신된 쿼리:", req.body.query);
  
  setTimeout(() => {
    res.json(mockData);
  }, 1500);
});

// POST /api/library - 연구 논문 서재 보관 처리
app.post('/api/library', async (req: Request, res: Response) => {
  try {
    const { paper } = req.body as { paper: PaperPayload };
    if (!paper) {
      return res.status(400).json({ status: 'error', message: 'Paper data is required.' });
    }

    if (!supabase) {
      throw new Error('Supabase client is not initialized. Please configure env variables.');
    }

    const { data, error } = await supabase
      .from('saved_papers')
      .insert([
        {
          paper_id: paper.id,
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
