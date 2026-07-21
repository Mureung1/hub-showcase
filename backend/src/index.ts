import express from 'express';
import { requireAuth } from './middleware/auth';
import { authRouter } from './routes/auth';
import { ingredientsRouter } from './routes/ingredients';
import { productsRouter } from './routes/products';

const app = express();
const PORT = 3000;

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/auth', authRouter);
app.use('/ingredients', ingredientsRouter);
app.use('/products', productsRouter);

app.get('/auth/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
