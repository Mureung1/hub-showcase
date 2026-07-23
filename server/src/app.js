import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import healthRoutes from './routes/health.js';
import authRoutes from './routes/auth.js';
import bakeryRoutes from './routes/bakeries.js';
import routeRoutes from './routes/routes.js';
import userRoutes from './routes/users.js';
import recommendRoutes from './routes/recommend.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api', healthRoutes);
app.use('/api', authRoutes);
app.use('/api', bakeryRoutes);
app.use('/api', routeRoutes);
app.use('/api', userRoutes);
app.use('/api', recommendRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`빵지도 API 서버 http://localhost:${PORT}`));
