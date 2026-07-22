import express from 'express';
import { getSupabaseClient } from '../db/supabaseClient.js';

const router = express.Router();

/**
 * POST /api/drafts
 * 생성된 영상을 보관함에 자동 저장 (발행 전)
 *
 * Request Body:
 * {
 *   "video_id": 1,
 *   "video_url": "https://...",
 *   "store_id": 1,
 *   "hashtags": "#라떼 #신메뉴",
 *   "title": "신메뉴 소개 영상"
 * }
 */
router.post('/', async (req, res) => {
  try {
    const { video_id, video_url, store_id, hashtags, title } = req.body;

    // 필수값 검증
    if (!video_id || !video_url || !store_id) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['video_id', 'video_url', 'store_id']
      });
    }

    const supabase = getSupabaseClient();

    // 1. 가게 존재 확인
    const { data: store, error: storeError } = await supabase
      .from('store_info')
      .select('store_id')
      .eq('store_id', parseInt(store_id))
      .single();

    if (storeError && storeError.code !== 'PGRST116') {
      console.error('[POST /api/drafts] 가게 조회 오류:', storeError);
      return res.status(500).json({
        error: 'Failed to check store',
        message: storeError.message
      });
    }

    if (!store) {
      return res.status(404).json({
        error: 'Store not found',
        message: `store_id ${store_id}는 존재하지 않습니다`
      });
    }

    // 2. Draft 상태로 저장 (published_videos 테이블)
    const { data: draftRecord, error: draftError } = await supabase
      .from('published_videos')
      .insert([{
        video_id: parseInt(video_id),
        store_id: parseInt(store_id),
        platform: 'draft',
        title: title || null,
        hashtags: hashtags || null,
        published_at: new Date().toISOString()
      }])
      .select();

    if (draftError) {
      console.error('[POST /api/drafts] Draft 저장 오류:', draftError);
      return res.status(500).json({
        error: 'Failed to save draft',
        message: draftError.message
      });
    }

    console.log(`[POST /api/drafts] 영상 자동 저장됨: video_id=${video_id}`);

    res.status(200).json({
      success: true,
      message: '영상이 보관함에 저장되었습니다',
      data: {
        video_id: parseInt(video_id),
        platform: 'draft',
        saved_at: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('[POST /api/drafts] 오류:', error);
    res.status(500).json({
      error: 'Failed to save draft',
      message: error.message
    });
  }
});

export default router;
