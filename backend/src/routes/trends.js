import express from 'express';
import { getDatabase } from '../db/client.js';

const router = express.Router();

// GET /api/trends - 카테고리별 트렌드 키워드 조회
router.get('/', (req, res) => {
  try {
    const { category } = req.query;

    if (!category || typeof category !== 'string' || category.trim() === '') {
      return res.status(400).json({ error: 'category 파라미터는 필수입니다' });
    }

    const db = getDatabase();

    // DB에서 해당 카테고리의 트렌드 키워드 조회 (최신순)
    const trends = db.prepare(`
      SELECT keyword_id, category, hashtag, keyword, platform, search_volume, post_count,
             total_views, total_likes, trend_score, crawled_at
      FROM trend_keywords
      WHERE category = ?
      ORDER BY trend_score DESC
      LIMIT 10
    `).all(category.trim());

    if (trends.length === 0) {
      // 데이터가 없으면 경고 로그 출력하고 빈 배열 반환
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
      data: trends
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
