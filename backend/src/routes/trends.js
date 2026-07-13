import express from 'express';
import { getSupabaseClient } from '../db/supabaseClient.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { category } = req.query;

    if (!category || typeof category !== 'string' || category.trim() === '') {
      return res.status(400).json({ error: 'category 파라미터는 필수입니다' });
    }

    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('trend_keywords')
      .select('*')
      .eq('category', category.trim())
      .order('trend_score', { ascending: false })
      .limit(10);

    if (error) {
      console.error('[GET /api/trends] Supabase 오류:', error);
      return res.status(500).json({
        error: 'Failed to fetch trends',
        message: error.message
      });
    }

    if (!data || data.length === 0) {
      console.warn(`[/api/trends] 카테고리 '${category}'에 대한 트렌드 데이터가 없습니다. seed 데이터를 로드해주세요.`);
      return res.status(200).json({
        success: true,
        message: '트렌드 데이터 없음 (seed 데이터 필요)',
        data: []
      });
    }

    res.status(200).json({
      success: true,
      message: '트렌드 데이터 조회 성공',
      data
    });
  } catch (error) {
    console.error('[/api/trends] 오류:', error);
    res.status(500).json({
      error: 'Failed to fetch trends',
      message: error.message
    });
  }
});

export default router;
