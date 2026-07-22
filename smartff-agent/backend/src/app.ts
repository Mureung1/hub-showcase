import express from 'express';
import cors from 'cors';
import uploadRoutes from './routes/uploadRoutes';
import financialRoutes from './routes/financialRoutes';
import recommendationRoutes from './routes/recommendationRoutes';
import patternRoutes from './routes/patternRoutes';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/uploads', uploadRoutes);
app.use('/api/financial', financialRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/patterns', patternRoutes);

export default app;
