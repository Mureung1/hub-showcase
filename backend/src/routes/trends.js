import express from 'express';
import { getSupabaseClient } from '../db/supabaseClient.js';
import { fetchNaverTrendData, categoryToKeywords } from '../services/naverTrends.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { category } = req.query;

    if (!category || typeof category !== 'string' || category.trim() === '') {
      return res.status(400).json({ error: 'category 파라미터는 필수입니다' });
    }

    const trimmedCategory = category.trim();

    // 네이버 API 시도
    console.log(`[/api/trends] 카테고리 '${trimmedCategory}' 네이버 API 조회 시작`);
    const naverData = await fetchNaverTrendsForCategory(trimmedCategory);

    if (naverData && naverData.length > 0) {
      console.log(`[/api/trends] 네이버 API에서 ${naverData.length}개 트렌드 반환`);
      return res.status(200).json({
        success: true,
        message: '네이버 API 트렌드 데이터 조회 성공',
        source: 'naver',
        data: naverData
      });
    }

    // 네이버 API 실패 시 Supabase seed 데이터로 폴백
    console.warn(`[/api/trends] 네이버 API 데이터 없음, Supabase seed 데이터 폴백 시도`);
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('trend_keywords')
      .select('*')
      .eq('category', trimmedCategory)
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
      console.warn(`[/api/trends] Supabase에도 카테고리 '${trimmedCategory}'의 데이터가 없습니다`);
      return res.status(200).json({
        success: true,
        message: '트렌드 데이터 없음',
        source: 'none',
        data: []
      });
    }

    res.status(200).json({
      success: true,
      message: 'Seed 데이터 조회 성공',
      source: 'supabase',
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

/**
 * 카테고리에 해당하는 키워드들의 트렌드 점수 조회
 * @param {string} category - 업종 카테고리
 * @returns {Promise<Array>} 트렌드 데이터 배열
 */
async function fetchNaverTrendsForCategory(category) {
  const keywords = categoryToKeywords[category];

  if (!keywords || keywords.length === 0) {
    console.warn(`[fetchNaverTrendsForCategory] 카테고리 '${category}'는 지원하지 않습니다`);
    return null;
  }

  const results = [];

  // 각 키워드별로 네이버 API 호출
  for (const keyword of keywords.slice(0, 10)) {
    try {
      const trendData = await fetchNaverTrendData(keyword, '1w');

      if (trendData && trendData.length > 0) {
        // 최근 검색량(ratio)을 트렌드 점수로 사용 (0~100)
        const latestRatio = trendData[trendData.length - 1].ratio || 0;
        const score = Math.round(latestRatio * 100);

        results.push({
          keyword,
          category,
          trend_score: score,
          data_source: 'naver_datalab',
          fetched_at: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error(`[fetchNaverTrendsForCategory] 키워드 '${keyword}' 조회 실패:`, error.message);
    }
  }

  // 트렌드 점수 높은 순으로 정렬
  results.sort((a, b) => b.trend_score - a.trend_score);

  return results.length > 0 ? results.slice(0, 10) : null;
}

export default router;
