import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// .env 환경변수 활성화
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// 미들웨어 등록
app.use(cors()); // 로컬 테스트 단계에서는 모든 요청 허용
app.use(express.json()); // JSON 요청 본문(body) 해석용

// 기본 홈 라우트
app.get('/', (req: Request, res: Response) => {
  res.send('FitCheck Express 서버가 정상 작동 중입니다! 🚀');
});

// 웹(web-trainer)과 앱(app-member)이 호출할 샘플 API
app.get('/api/test', (req: Request, res: Response) => {
  res.json({
    message: '성공적으로 서버와 연결되었습니다.',
    status: 'success',
  });
});

// 서버 시작
app.listen(PORT, () => {
  console.log(`✅ 서버가 실행되었습니다: http://localhost:${PORT}`);
});
