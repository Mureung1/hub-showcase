require('dotenv').config({ path: '.env.local' });
const express = require('express');
const cors = require('cors');
const supabase = require('./services/supabase');

const app = express();
app.use(cors()); // 모든 도메인 허용
app.use(express.json());

app.get('/api/health', async (req, res) => {
  const { count, error } = await supabase
    .from('keywords')
    .select('*', { count: 'exact', head: true });

  if (error) {
    return res.status(500).json({ error: 'db_connection_failed' });
  }

  res.json({ status: 'ok', keywords_count: count });
});

const PORT = process.env.PORT || 3001;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
