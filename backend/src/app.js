import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fridgeRouter from './routes/fridge.js';
import receiptsRouter from './routes/receipts.js';
import recipesRouter from './routes/recipes.js';
import shoppingRouter from './routes/shopping.js';
import pricesRouter from './routes/prices.js';
import mealPlanRouter from './routes/mealPlan.js';

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

app.use(express.static(frontendDistPath));

app.use((req, res) => res.status(404).json({ error: `Not found: ${req.method} ${req.path}` }));

export default app;
