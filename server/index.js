import express from 'express';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getSupabaseClient, SupabaseConfigurationError } from './supabase.js';

const SERVER_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.join(SERVER_DIRECTORY, '.env') });

const app = express();
const PORT = process.env.PORT || 4000;

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/health/db', async (req, res) => {
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from('study_plans').select('id').limit(1);

    if (error) {
      console.error('Database health check failed.');
      return res.status(503).json({
        status: 'error',
        database: 'disconnected',
        message: 'Database connection check failed.',
      });
    }

    return res.json({
      status: 'ok',
      database: 'connected',
    });
  } catch (error) {
    if (error instanceof SupabaseConfigurationError) {
      console.error(`Database health check configuration error: ${error.message}`);
      return res.status(500).json({
        status: 'error',
        database: 'disconnected',
        message: error.message,
      });
    }

    console.error('Database health check failed.');
    return res.status(503).json({
      status: 'error',
      database: 'disconnected',
      message: 'Database connection check failed.',
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
