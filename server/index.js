import express from 'express';
import cors from 'cors';
import analyzeRouter from './routes/analyze.js';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.use('/api', analyzeRouter);

app.listen(PORT, () => {
  console.log(`AI Portfolio Agent server listening on http://localhost:${PORT}`);
});
