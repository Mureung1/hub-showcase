// .env를 가장 먼저 로드한다. (db.js가 import 시점에 SUPABASE 키를 읽으므로 순서가 중요)
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import router from './src/routes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND_DIR = path.join(__dirname, '..', 'frontend');
const PORT = process.env.PORT || 5000;

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api', router);

// 프론트엔드 정적 서빙 + SPA fallback
app.use(express.static(FRONTEND_DIR));
app.get('*', (req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
});

app.listen(PORT, () => {
  console.log('Starting ABCDEF Express Server...');
  console.log(`Open your browser and go to: http://localhost:${PORT}`);
});
