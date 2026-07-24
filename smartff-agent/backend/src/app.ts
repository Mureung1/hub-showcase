import express from 'express';
import cors from 'cors';
import { requestLogger } from './middleware/requestLogger';
import uploadRoutes from './routes/uploadRoutes';
import financialRoutes from './routes/financialRoutes';
import recommendationRoutes from './routes/recommendationRoutes';
import patternRoutes from './routes/patternRoutes';
import telemetryRoutes from './routes/telemetryRoutes';

const app = express();

app.use(cors({ origin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());
app.use(requestLogger);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/uploads', uploadRoutes);
app.use('/api/financial', financialRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/patterns', patternRoutes);
app.use('/api/telemetry', telemetryRoutes);

export default app;
