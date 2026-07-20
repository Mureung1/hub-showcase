const express = require('express');
const supabase = require('../services/supabase');

const router = express.Router();

router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('keywords')
    .select('id, name');

  if (error) {
    return res.status(500).json({ error: 'db_connection_failed' });
  }

  res.json(data);
});

module.exports = router;
