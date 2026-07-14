import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initializeDatabase } from './db/supabaseClient.js';
import storeRoutes from './routes/store.js';
import trendsRoutes from './routes/trends.js';
import uploadRoutes from './routes/upload.js';
import publishRoutes from './routes/publish.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('uploads')); // 업로드된 파일 정적 서빙

// Initialize database
await initializeDatabase();

// Routes
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is running' });
});

app.use('/api/store', storeRoutes);
app.use('/api/trends', trendsRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/publish', publishRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`[ShortsGen Backend] Server running on http://localhost:${PORT}`);
  console.log(`[ShortsGen Backend] Health check: http://localhost:${PORT}/api/health`);
});
