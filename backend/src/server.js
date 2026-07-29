import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initializeDatabase, getSupabaseClient } from './db/supabaseClient.js';
import storeRoutes from './routes/store.js';
import trendsRoutes from './routes/trends.js';
import uploadRoutes from './routes/upload.js';
import publishRoutes from './routes/publish.js';
import draftsRoutes from './routes/drafts.js';
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

// CORS 설정 (가장 강력한 버전)
const corsOptions = {
  origin: function (origin, callback) {
    // 모든 origin 허용
    callback(null, true);
  },
  credentials: false,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH', 'HEAD'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200,
  preflightContinue: false
};

app.use(cors(corsOptions));

// Preflight 요청 명시적 처리
app.options('*', cors(corsOptions));

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

// Seed 데이터 로드 (개발용)
app.post('/api/admin/seed', async (req, res) => {
  try {
    const supabase = getSupabaseClient();

    console.log('[Seed 데이터] 로드 시작...');

    // 1. 트렌드 키워드
    const trendKeywords = [
      { keyword: '#신메뉴', category: '음식', search_volume: 15000, platform: 'instagram' },
      { keyword: '#카페', category: '카페', search_volume: 25000, platform: 'instagram' },
      { keyword: '#디저트', category: '음식', search_volume: 18000, platform: 'tiktok' },
      { keyword: '#라떼', category: '음료', search_volume: 8500, platform: 'instagram' }
    ];
    await supabase.from('trend_keywords').insert(trendKeywords).select();

    // 2. 샘플 가게
    const stores = [
      { store_name: '카페 에스프레소', category: '카페', location: '서울 강남구', signature_menu: '핸드드립 커피' },
      { store_name: '라면왕', category: '음식점', location: '서울 명동', signature_menu: '신라면' },
      { store_name: '디저트팜', category: '베이커리', location: '부산 해운대', signature_menu: '생크림 케이크' }
    ];
    const { data: storeData } = await supabase.from('store_info').insert(stores).select();

    // 3. 발행 기록
    const publishedVideos = [
      { video_id: 1, store_id: storeData?.[0]?.store_id, platform: 'draft', title: '신 블루베리 라떼', hashtags: '#라떼 #신메뉴' },
      { video_id: 2, store_id: storeData?.[0]?.store_id, platform: 'instagram', title: '핸드드립 커피', hashtags: '#커피 #카페' }
    ];
    await supabase.from('published_videos').insert(publishedVideos).select();

    console.log('[✅ Seed 데이터 로드 완료]');

    res.status(200).json({
      status: 'ok',
      message: 'Seed data loaded successfully',
      data: {
        trends: trendKeywords.length,
        stores: storeData?.length || 0,
        published_videos: publishedVideos.length
      }
    });
  } catch (error) {
    console.error('[❌ Seed 데이터 로드 실패]', error);
    res.status(500).json({
      error: error.message
    });
  }
});

app.use('/api/store', storeRoutes);
app.use('/api/trends', trendsRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/publish', publishRoutes);
app.use('/api/drafts', draftsRoutes);
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
