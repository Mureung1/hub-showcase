import express from 'express';
import { getSupabaseClient } from '../db/supabaseClient.js';

const router = express.Router();

/**
 * SNS 플랫폼별 발행 처리
 * @param {string} platform - 'instagram' | 'tiktok'
 * @param {Object} videoData - { video_id, video_url, hashtags, store_id }
 * @returns {Promise<Object>} 발행 결과
 */
async function publishToSNS(platform, videoData) {
  console.log(`[publishToSNS] ${platform} 발행 시작:`, videoData);

  try {
    // TODO: 실제 API 연동
    // - Instagram: Instagram Graph API (instagram-python-library)
    // - TikTok: TikTok Official API (tiktok-official-sdk)

    // 현재: Mock 발행 (실제 발행 대신 로그만 기록)
    if (platform === 'instagram') {
      // Mock: Instagram Reels에 발행한다고 가정
      console.log(`[Instagram] Reels 발행 완료`);
      console.log(`  - 해시태그: ${videoData.hashtags}`);
      console.log(`  - 자막: 포함됨`);
      return {
        success: true,
        platform: 'instagram',
        post_id: `inst_${Date.now()}`,
        message: 'Instagram Reels 발행 완료 (Mock)'
      };
    } else if (platform === 'tiktok') {
      // Mock: TikTok에 발행한다고 가정
      console.log(`[TikTok] 영상 발행 완료`);
      console.log(`  - 해시태그: ${videoData.hashtags}`);
      console.log(`  - 썸네일: 자동 생성됨`);
      return {
        success: true,
        platform: 'tiktok',
        post_id: `tt_${Date.now()}`,
        message: 'TikTok 영상 발행 완료 (Mock)'
      };
    }

    throw new Error(`지원하지 않는 플랫폼: ${platform}`);
  } catch (error) {
    console.error(`[publishToSNS] ${platform} 발행 오류:`, error);
    throw error;
  }
}

/**
 * POST /api/publish
 * 생성된 영상을 SNS에 발행
 *
 * Request Body:
 * {
 *   "video_id": 1,
 *   "video_url": "https://...",
 *   "platform": "instagram" | "tiktok",
 *   "store_id": 1,
 *   "hashtags": "#라떼 #신메뉴 #카페",
 *   "title": "신메뉴 소개 영상"
 * }
 */
router.post('/', async (req, res) => {
  try {
    const { video_id, video_url, platform, store_id, hashtags, title } = req.body;

    // 필수값 검증
    if (!video_id || !video_url || !platform || !store_id) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['video_id', 'video_url', 'platform', 'store_id']
      });
    }

    // platform 검증
    if (!['instagram', 'tiktok'].includes(platform)) {
      return res.status(400).json({
        error: 'Invalid platform',
        allowed: ['instagram', 'tiktok']
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
      console.error('[POST /api/publish] 가게 조회 오류:', storeError);
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

    // 2. 생성된 영상 기록 존재 확인
    const { data: video, error: videoError } = await supabase
      .from('generated_videos')
      .select('*')
      .eq('video_id', parseInt(video_id))
      .eq('store_id', parseInt(store_id))
      .single();

    if (videoError && videoError.code !== 'PGRST116') {
      console.error('[POST /api/publish] 영상 조회 오류:', videoError);
      return res.status(500).json({
        error: 'Failed to check video',
        message: videoError.message
      });
    }

    if (!video) {
      return res.status(404).json({
        error: 'Video not found',
        message: `video_id ${video_id}는 존재하지 않습니다`
      });
    }

    // 3. SNS 발행 처리
    const snsResult = await publishToSNS(platform, {
      video_id,
      video_url,
      hashtags: hashtags || video.hashtags || '',
      title: title || '생성된 릴스 영상'
    });

    // 4. 발행 기록 저장 (published_videos 테이블)
    const { data: publishRecord, error: publishError } = await supabase
      .from('published_videos')
      .insert([{
        video_id: parseInt(video_id),
        store_id: parseInt(store_id),
        platform: platform,
        post_id: snsResult.post_id,
        title: title || null,
        hashtags: hashtags || null,
        published_at: new Date().toISOString()
      }])
      .select();

    if (publishError) {
      console.warn('[POST /api/publish] 발행 기록 저장 실패:', publishError);
      // 발행은 성공했지만 기록 저장 실패 → 계속 진행
    }

    console.log(`[POST /api/publish] ${platform} 발행 성공: video_id=${video_id}`);

    res.status(200).json({
      success: true,
      message: `${platform} 발행이 완료되었습니다`,
      data: {
        video_id: parseInt(video_id),
        platform: platform,
        post_id: snsResult.post_id,
        published_at: new Date().toISOString(),
        publish_message: snsResult.message
      }
    });
  } catch (error) {
    console.error('[POST /api/publish] 오류:', error);
    res.status(500).json({
      error: 'Failed to publish video',
      message: error.message
    });
  }
});

/**
 * GET /api/publish/:storeId
 * 가게의 발행 기록 조회 (선택사항)
 */
router.get('/:storeId', async (req, res) => {
  try {
    const { storeId } = req.params;

    if (!storeId || isNaN(storeId)) {
      return res.status(400).json({
        error: 'Invalid store ID'
      });
    }

    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('published_videos')
      .select('*')
      .eq('store_id', parseInt(storeId))
      .order('published_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('[GET /api/publish/:storeId] 조회 오류:', error);
      return res.status(500).json({
        error: 'Failed to fetch publish records',
        message: error.message
      });
    }

    res.status(200).json({
      success: true,
      data: data || []
    });
  } catch (error) {
    console.error('[GET /api/publish/:storeId] 오류:', error);
    res.status(500).json({
      error: 'Failed to fetch publish records',
      message: error.message
    });
  }
});

export default router;
