import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initializeDatabase, getSupabaseClient } from './db/supabaseClient.js';
import storeRoutes from './routes/store.js';
import trendsRoutes from './routes/trends.js';
import uploadRoutes from './routes/upload.js';
import publishRoutes from './routes/publish.js';
import generateRoutes from './routes/generate.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// 환경변수 진단 (시작 시 출력)
function checkEnvironmentVariables() {
  console.log('\n[환경변수 검사]\n');

  const vars = {
    'PORT': process.env.PORT,
    'SUPABASE_URL': process.env.SUPABASE_URL ? '✅ 설정됨' : '❌ 미설정',
    'SUPABASE_KEY': process.env.SUPABASE_KEY ? '✅ 설정됨 (마스킹)' : '❌ 미설정',
    'NAVER_CLIENT_ID': process.env.NAVER_CLIENT_ID ? '✅ 설정됨' : '❌ 미설정',
    'NAVER_CLIENT_SECRET': process.env.NAVER_CLIENT_SECRET ? '✅ 설정됨 (마스킹)' : '❌ 미설정',
    'TIKTOK_CLIENT_ID': process.env.TIKTOK_CLIENT_ID ? '✅ 설정됨' : '⏳ 선택사항 (미설정)',
    'TIKTOK_CLIENT_SECRET': process.env.TIKTOK_CLIENT_SECRET ? '✅ 설정됨 (마스킹)' : '⏳ 선택사항 (미설정)',
    'TIKTOK_ACCESS_TOKEN': process.env.TIKTOK_ACCESS_TOKEN ? '✅ 설정됨 (마스킹)' : '⏳ 선택사항 (미설정)',
    'INSTAGRAM_ACCESS_TOKEN': process.env.INSTAGRAM_ACCESS_TOKEN ? '✅ 설정됨 (마스킹)' : '⏳ 선택사항 (미설정)'
  };

  Object.entries(vars).forEach(([key, value]) => {
    console.log(`  ${key}: ${value}`);
  });

  console.log('\n');
}

checkEnvironmentVariables();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('uploads')); // 업로드된 파일 정적 서빙
app.use('/ai-output', express.static('ai-pipeline/output')); // AI 생성 파일 정적 서빙

// Initialize database
await initializeDatabase();

// Routes
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is running' });
});

app.get('/api/config', (req, res) => {
  res.status(200).json({
    status: 'ok',
    environment: {
      PORT: process.env.PORT,
      SUPABASE_URL: process.env.SUPABASE_URL ? '✅ 설정됨' : '❌ 미설정',
      SUPABASE_KEY: process.env.SUPABASE_KEY ? '✅ 설정됨' : '❌ 미설정',
      NAVER_CLIENT_ID: process.env.NAVER_CLIENT_ID ? '✅ 설정됨' : '❌ 미설정',
      NAVER_CLIENT_SECRET: process.env.NAVER_CLIENT_SECRET ? '✅ 설정됨' : '❌ 미설정',
      TIKTOK_CLIENT_ID: process.env.TIKTOK_CLIENT_ID ? '✅ 설정됨' : '⏳ 미설정',
      TIKTOK_CLIENT_SECRET: process.env.TIKTOK_CLIENT_SECRET ? '✅ 설정됨' : '⏳ 미설정',
      TIKTOK_ACCESS_TOKEN: process.env.TIKTOK_ACCESS_TOKEN ? '✅ 설정됨' : '⏳ 미설정',
      INSTAGRAM_ACCESS_TOKEN: process.env.INSTAGRAM_ACCESS_TOKEN ? '✅ 설정됨' : '⏳ 미설정'
    }
  });
});

// DB 초기화 (개발용)
app.post('/api/admin/reset', async (req, res) => {
  try {
    const supabase = getSupabaseClient();

    console.log('[DB 초기화] 데이터 삭제 중...');

    // 외래키 제약 때문에 순서 중요
    await supabase.from('generation_steps').delete().neq('id', '');
    await supabase.from('generation_jobs').delete().neq('id', '');
    await supabase.from('uploaded_images').delete().neq('id', '');
    await supabase.from('stores').delete().neq('id', '');

    console.log('[✅ DB 초기화 완료]');

    res.status(200).json({
      status: 'ok',
      message: 'Database reset completed'
    });
  } catch (error) {
    console.error('[❌ DB 초기화 실패]', error);
    res.status(500).json({
      error: error.message
    });
  }
});

app.use('/api/store', storeRoutes);
app.use('/api/trends', trendsRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/publish', publishRoutes);
app.use('/api/generate', generateRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`[ShortsGen Backend] Server running on http://localhost:${PORT}`);
  console.log(`[ShortsGen Backend] Health check: http://localhost:${PORT}/api/health`);
});
