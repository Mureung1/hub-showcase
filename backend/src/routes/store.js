import express from 'express';
import { getSupabaseClient } from '../db/supabaseClient.js';

const router = express.Router();

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

router.post('/', async (req, res) => {
  try {
    const storeData = {
      store_name: req.body.store_name ?? req.body.name,
      owner_name: req.body.owner_name ?? null,
      category: req.body.category,
      location: req.body.location,
      signature_item: req.body.signature_item ?? req.body.signature_menu
    };

    const errors = validateStoreData(storeData);
    if (errors.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors
      });
    }

    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('store_info')
      .insert([{
        store_name: storeData.store_name.trim(),
        owner_name: storeData.owner_name?.trim() ?? null,
        category: storeData.category.trim(),
        location: storeData.location.trim(),
        signature_item: storeData.signature_item.trim()
      }])
      .select();

    if (error) {
      console.error('[POST /api/store] Supabase 오류:', error);
      return res.status(500).json({
        error: 'Failed to save store information',
        message: error.message
      });
    }

    res.status(201).json({
      success: true,
      message: '가게 정보가 저장되었습니다',
      data: data[0]
    });
  } catch (error) {
    console.error('[POST /api/store] 오류:', error);
    res.status(500).json({
      error: 'Failed to save store information',
      message: error.message
    });
  }
});

router.get('/latest', async (req, res) => {
  try {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('store_info')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'No store information found' });
      }
      console.error('[GET /api/store/latest] Supabase 오류:', error);
      return res.status(500).json({
        error: 'Failed to fetch latest store information',
        message: error.message
      });
    }

    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    console.error('[GET /api/store/latest] 오류:', error);
    res.status(500).json({
      error: 'Failed to fetch latest store information',
      message: error.message
    });
  }
});

router.get('/:storeId', async (req, res) => {
  try {
    const { storeId } = req.params;

    if (!storeId || isNaN(storeId)) {
      return res.status(400).json({ error: 'Invalid store ID' });
    }

    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('store_info')
      .select('*')
      .eq('store_id', parseInt(storeId))
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Store not found' });
      }
      console.error('[GET /api/store/:storeId] Supabase 오류:', error);
      return res.status(500).json({
        error: 'Failed to fetch store information',
        message: error.message
      });
    }

    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    console.error('[GET /api/store/:storeId] 오류:', error);
    res.status(500).json({
      error: 'Failed to fetch store information',
      message: error.message
    });
  }
});

export default router;
