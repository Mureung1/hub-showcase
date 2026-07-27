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

// 서버 포트 리스닝 및 Graceful Shutdown (테스트 환경이 아닐 때만 실행)
if (process.env.NODE_ENV !== 'test') {
  const server = app.listen(PORT, () => {
    console.log(`==================================================`);
    console.log(` Scholar-Sync AI Server is running on port ${PORT}`);
    console.log(` Health Check: http://localhost:${PORT}/`);
    console.log(`==================================================`);
  });

  let isShuttingDown = false;

  const handleGracefulShutdown = (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    console.log(`\n⚠️ [${signal}] Graceful Shutdown 시그널 감지. 포트 ${PORT} 및 진행 중인 요청을 안전하게 해제합니다...`);

    // 10초 강제 종료 안전 타임아웃
    const forceKillTimer = setTimeout(() => {
      console.error('❌ Graceful Shutdown 타임아웃 초과 (10초). 프로세스를 강제 종료합니다.');
      process.exit(1);
    }, 10000);
    forceKillTimer.unref();

    server.close((err) => {
      if (err) {
        console.error('❌ HTTP 서버 종료 중 오류 발생:', err);
        process.exit(1);
      }
      console.log('✅ HTTP 서버 및 소켓 자원이 성공적으로 해제되었습니다.');
      process.exit(0);
    });
  };

  process.on('SIGINT', () => handleGracefulShutdown('SIGINT'));
  process.on('SIGTERM', () => handleGracefulShutdown('SIGTERM'));

  process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught Exception 발생:', err);
    handleGracefulShutdown('uncaughtException');
  });

  process.on('unhandledRejection', (reason) => {
    console.error('❌ Unhandled Rejection 발생:', reason);
    handleGracefulShutdown('unhandledRejection');
  });
}

export default app;
