import express from 'express';
import cors from 'cors';
import uploadRoutes from './routes/uploadRoutes';
import financialRoutes from './routes/financialRoutes';
import recommendationRoutes from './routes/recommendationRoutes';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/uploads', uploadRoutes);
app.use('/api/financial', financialRoutes);
app.use('/api/recommendations', recommendationRoutes);

export default app;
