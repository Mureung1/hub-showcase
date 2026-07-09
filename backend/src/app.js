import express from 'express';
import cors from 'cors';
import fridgeRouter from './routes/fridge.js';
import receiptsRouter from './routes/receipts.js';
import recipesRouter from './routes/recipes.js';
import shoppingRouter from './routes/shopping.js';
import pricesRouter from './routes/prices.js';
import mealPlanRouter from './routes/mealPlan.js';

const app = express();

// FE dev 서버(5174)와 BE(3001)는 포트가 달라 브라우저가 기본 차단(CORS)한다 — 여기서 허용해야 통한다.
app.use(cors());
app.use(express.json());

app.use('/api/fridge', fridgeRouter);
app.use('/api/receipts', receiptsRouter);
app.use('/api/recipes', recipesRouter);
app.use('/api/shopping', shoppingRouter); // GET /api/shopping/sets, GET /api/shopping/list
app.use('/api/prices', pricesRouter);
app.use('/api/meal-plan', mealPlanRouter);

app.use((req, res) => res.status(404).json({ error: `Not found: ${req.method} ${req.path}` }));

export default app;
