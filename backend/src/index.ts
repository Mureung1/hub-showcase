import express from 'express';
import { requireAuth } from './middleware/auth';
import { authRouter } from './routes/auth';
import { ingredientsRouter } from './routes/ingredients';

const app = express();
const PORT = 3000;

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/auth', authRouter);
app.use('/ingredients', ingredientsRouter);

app.get('/auth/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
