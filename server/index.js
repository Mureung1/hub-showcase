import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import tideChecksRouter from './routes/tideChecks.js';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.use('/api/tide-checks', tideChecksRouter);

app.listen(PORT, () => {
  console.log(`TideNote API listening on http://localhost:${PORT}`);
});
