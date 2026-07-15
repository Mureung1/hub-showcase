import express from 'express';
import cors from 'cors';
import uploadRoutes from './routes/uploadRoutes';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/uploads', uploadRoutes);

export default app;
