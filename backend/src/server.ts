import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import projectsRouter from './routes/projects';
import extractRouter from './routes/extract';
import shareRouter from './routes/share';

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/api/projects', projectsRouter);
app.use('/api/extract', extractRouter);
app.use('/api/share', shareRouter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
