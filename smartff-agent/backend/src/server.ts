import app from './app';
import { restoreFromSupabase } from './services/masterDataSyncService';

const PORT = Number(process.env.PORT) || 5000;

restoreFromSupabase().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});
