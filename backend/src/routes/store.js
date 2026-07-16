import express from 'express';
import { getSupabaseClient } from '../db/supabaseClient.js';

const router = express.Router();

function validateStoreData(data) {
  const errors = [];

  // 필수: 가게명, 업종
  if (!data.store_name || typeof data.store_name !== 'string' || data.store_name.trim() === '') {
    errors.push('store_name: 필수 필드입니다');
  }

  if (!data.category || typeof data.category !== 'string' || data.category.trim() === '') {
    errors.push('category: 필수 필드입니다');
  }

  // 옵션: 위치, 시그니처 상품, 대표자명 (빈 값 허용)

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

    // 같은 store_name이 이미 존재하는지 확인
    const { data: existingStore, error: selectError } = await supabase
      .from('store_info')
      .select('store_id')
      .eq('store_name', storeData.store_name.trim())
      .single();

    if (selectError && selectError.code !== 'PGRST116') {
      // PGRST116 = no rows found (정상)
      console.error('[POST /api/store] 조회 오류:', selectError);
      return res.status(500).json({
        error: 'Failed to check existing store',
        message: selectError.message
      });
    }

    const trimmedData = {
      store_name: storeData.store_name.trim(),
      owner_name: storeData.owner_name?.trim() ?? null,
      category: storeData.category.trim(),
      location: storeData.location?.trim() ?? null,
      signature_item: storeData.signature_item?.trim() ?? null,
      phone: storeData.phone?.trim() ?? null,
      instagram_url: storeData.instagram_url?.trim() ?? null,
      page_url: storeData.page_url?.trim() ?? null,
      store_description: storeData.store_description?.trim() ?? null,
      profile_image_url: storeData.profile_image_url ?? null
    };

    let result;
    if (existingStore) {
      // 이미 존재하면 UPDATE
      const { data, error } = await supabase
        .from('store_info')
        .update(trimmedData)
        .eq('store_id', existingStore.store_id)
        .select();

      if (error) {
        console.error('[POST /api/store] 업데이트 오류:', error);
        return res.status(500).json({
          error: 'Failed to update store information',
          message: error.message
        });
      }

      result = { data, action: 'updated' };
    } else {
      // 없으면 INSERT
      const { data, error } = await supabase
        .from('store_info')
        .insert([trimmedData])
        .select();

      if (error) {
        console.error('[POST /api/store] 삽입 오류:', error);
        return res.status(500).json({
          error: 'Failed to save store information',
          message: error.message
        });
      }

      result = { data, action: 'created' };
    }

    res.status(result.action === 'created' ? 201 : 200).json({
      success: true,
      message: result.action === 'created'
        ? '가게 정보가 저장되었습니다'
        : '가게 정보가 업데이트되었습니다',
      action: result.action,
      data: result.data[0]
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
