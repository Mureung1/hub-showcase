const express = require('express');
const db = require('../db');

const router = express.Router();

router.get('/', (req, res) => {
  const items = db.prepare('SELECT * FROM watchlist ORDER BY created_at ASC').all();
  res.json(items);
});

router.post('/', (req, res) => {
  const { type, value, label } = req.body || {};

  if (!['ticker', 'industry'].includes(type) || !value || !label) {
    return res.status(400).json({ error: 'type(ticker|industry), value, label are required' });
  }

  try {
    const result = db
      .prepare('INSERT INTO watchlist (type, value, label) VALUES (?, ?, ?)')
      .run(type, value.trim(), label.trim());
    const created = db.prepare('SELECT * FROM watchlist WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(created);
  } catch (err) {
    if (String(err.message).includes('UNIQUE')) {
      return res.status(409).json({ error: 'This item is already in the watchlist' });
    }
    res.status(500).json({ error: 'Failed to add watchlist item' });
  }
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM watchlist WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

module.exports = router;
