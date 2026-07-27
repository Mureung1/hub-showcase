import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import curateRouter from './routes/curate.routes.js';
import libraryRouter from './routes/library.routes.js';
export type { DbPaper, PaperPayload, LibraryItem } from './types/curate.types.js';
export { mapToCamelCase } from './utils/mapToCamelCase.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// 미들웨어 설정
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 기본 루트 엔드포인트
app.get('/', (req: Request, res: Response) => {
  res.json({
    status: 'success',
    message: 'Scholar-Sync AI Backend Server is running successfully!',
    timestamp: new Date().toISOString()
  });
});

// 라우터 마운트
app.use('/api', curateRouter);
app.use('/api', libraryRouter);

// 서버 포트 리스닝 (테스트 환경이 아닐 때만 실행)
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`==================================================`);
    console.log(` Scholar-Sync AI Server is running on port ${PORT}`);
    console.log(` Health Check: http://localhost:${PORT}/`);
    console.log(`==================================================`);
  });
}

export default app;
