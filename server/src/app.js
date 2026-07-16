import express from 'express';
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
app.use(cors()); // CORS 모든 도메인 허용 기본 설정
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 서버 동작 확인용 기본 루트 엔드포인트
app.get('/', (req, res) => {
  res.json({
    status: 'success',
    message: 'Scholar-Sync AI Backend Server is running successfully!',
    timestamp: new Date().toISOString()
  });
});

// POST /api/curate - 지능형 논문 큐레이션 및 에이전트 분석 수행 (Mock)
app.post('/api/curate', (req, res) => {
  console.log("📥 수신된 쿼리:", req.body.query);
  
  setTimeout(() => {
    res.json(mockData);
  }, 1500);
});

// POST /api/library - 연구 논문 서재 보관 처리
app.post('/api/library', async (req, res) => {
  try {
    const { paper } = req.body;
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
          match_score: paper.matchScore
        }
      ]);

    if (error) {
      throw error;
    }

    res.status(201).json({ status: 'success' });
  } catch (error) {
    console.error('❌ Library insert error:', error.message || error);
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
