import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import fridgeRouter from './routes/fridge.js';
import receiptsRouter from './routes/receipts.js';
import recipesRouter from './routes/recipes.js';
import shoppingRouter from './routes/shopping.js';
import pricesRouter from './routes/prices.js';
import mealPlanRouter from './routes/mealPlan.js';
import ingredientsRouter from './routes/ingredients.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDistPath = path.resolve(__dirname, '../../frontend/dist');

const app = express();

// FE dev 서버(5174)와 BE(3001)는 포트가 달라 브라우저가 기본 차단(CORS)한다 — 여기서 허용해야 통한다.
app.use(cors());
app.use(express.json());
// Content-Type이 application/json이 아니거나 body가 아예 없는 요청은 express.json()이
// req.body를 건드리지 않고 넘어가 undefined로 남는다 — 컨트롤러의 req.body.xxx 구조분해가
// 그대로 크래시하지 않도록 여기서 한 번에 기본값을 채워준다.
app.use((req, res, next) => {
  if (req.body === undefined) req.body = {};
  next();
});

app.use('/api/fridge', fridgeRouter);
app.use('/api/receipts', receiptsRouter);
app.use('/api/recipes', recipesRouter);
app.use('/api/shopping', shoppingRouter); // GET /api/shopping/sets, GET /api/shopping/list
app.use('/api/prices', pricesRouter);
app.use('/api/meal-plan', mealPlanRouter);
app.use('/api/ingredients', ingredientsRouter);

app.use(express.static(frontendDistPath));

app.use((req, res) => res.status(404).json({ error: `Not found: ${req.method} ${req.path}` }));

// multer(파일 업로드 크기 초과/잘못된 형식 등)를 포함해 라우트에서 next(err)로 넘어온 에러를
// Express 기본 HTML 에러 페이지 대신 이 앱의 나머지 응답과 동일한 JSON 형태로 돌려준다.
// 프론트가 err.message를 그대로 alert()에 띄우므로 multer의 영문 메시지는 한국어로 바꿔준다.
// (마지막 인자는 안 쓰지만 Express가 함수 arity로 에러 핸들러를 구분하므로 반드시 4개를 받아야 한다)
app.use((err, req, res, _next) => {
  console.error(err);
  if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: '사진 용량이 너무 커요(최대 8MB). 다시 촬영해 주세요.' });
  }
  res.status(err.status || 500).json({ error: err.message || '서버 오류가 발생했어요.' });
});

export default app;
