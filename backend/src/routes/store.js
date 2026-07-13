import express from 'express';
import { getDatabase } from '../db/client.js';

const router = express.Router();

// Validation helper
function validateStoreData(data) {
  const errors = [];

  if (!data.store_name || typeof data.store_name !== 'string' || data.store_name.trim() === '') {
    errors.push('store_name: 필수 필드입니다');
  }

  if (!data.category || typeof data.category !== 'string' || data.category.trim() === '') {
    errors.push('category: 필수 필드입니다');
  }

  if (!data.location || typeof data.location !== 'string' || data.location.trim() === '') {
    errors.push('location: 필수 필드입니다');
  }

  if (!data.signature_item || typeof data.signature_item !== 'string' || data.signature_item.trim() === '') {
    errors.push('signature_item: 필수 필드입니다');
  }

  return errors;
}

// POST /api/store - 가게 정보 저장
router.post('/', (req, res) => {
  try {
    const storeData = {
      store_name: req.body.store_name ?? req.body.name,
      owner_name: req.body.owner_name ?? null,
      category: req.body.category,
      location: req.body.location,
      signature_item: req.body.signature_item ?? req.body.signature_menu
    };

    // 유효성 검사
    const errors = validateStoreData(storeData);
    if (errors.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors
      });
    }

    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO store_info (store_name, owner_name, category, location, signature_item)
      VALUES (?, ?, ?, ?, ?)
    `);

    const info = stmt.run(
      storeData.store_name.trim(),
      storeData.owner_name?.trim() ?? null,
      storeData.category.trim(),
      storeData.location.trim(),
      storeData.signature_item.trim()
    );

    const inserted = db.prepare('SELECT * FROM store_info WHERE store_id = ?').get(info.lastInsertRowid);

    res.status(201).json({
      success: true,
      message: '가게 정보가 저장되었습니다',
      data: inserted
    });
  } catch (error) {
    console.error('[/api/store] Error:', error);
    res.status(500).json({
      error: 'Failed to save store information',
      message: error.message
    });
  }
});

// GET /api/store/:storeId - 가게 정보 조회
router.get('/:storeId', (req, res) => {
  try {
    const { storeId } = req.params;

    if (!storeId || isNaN(storeId)) {
      return res.status(400).json({ error: 'Invalid store ID' });
    }

    const db = getDatabase();
    const store = db.prepare('SELECT * FROM store_info WHERE store_id = ?').get(storeId);

    if (!store) {
      return res.status(404).json({ error: 'Store not found' });
    }

    res.status(200).json({
      success: true,
      data: store
    });
  } catch (error) {
    console.error('[/api/store/:id] Error:', error);
    res.status(500).json({
      error: 'Failed to fetch store information',
      message: error.message
    });
  }
});

export default router;
