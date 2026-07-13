import fetch from 'node-fetch';

const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID;
const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET;

// 업종 → 검색 키워드 그룹 매핑
export const categoryToKeywords = {
  카페: ['카페', '카푸치노', '아메리카노', '라떼', '빵', '디저트'],
  음식점: ['맛집', '음식', '한끼', '요리', '식당'],
  베이커리: ['베이커리', '빵', '크루아상', '케이크', '베이킹'],
  편의점: ['편의점', '간식', '음료', '편의점음식'],
  의류: ['패션', '의류', '코디', '옷', '룩북'],
  뷰티: ['뷰티', '화장품', '메이크업', '스킨케어'],
  기타: ['트렌드', '상품', '판매']
};

/**
 * 네이버 데이터랩 API로 검색어 트렌드 조회
 * @param {string} keyword - 검색 키워드
 * @param {string} period - 조회 기간 ('1d', '1w', '1m', '3m')
 * @returns {Promise<Array>} 검색량 추이 데이터
 */
export async function fetchNaverTrendData(keyword, period = '1m') {
  if (!NAVER_CLIENT_ID || !NAVER_CLIENT_SECRET) {
    console.warn('[NaverTrends] API 키가 설정되지 않았습니다. seed 데이터를 사용합니다.');
    return null;
  }

  try {
    const url = 'https://openapi.naver.com/v1/datalab/search';

    // 시간 범위 계산
    const now = new Date();
    const startDate = new Date(now);

    if (period === '1d') {
      startDate.setDate(now.getDate() - 1);
    } else if (period === '1w') {
      startDate.setDate(now.getDate() - 7);
    } else if (period === '1m') {
      startDate.setDate(now.getDate() - 30);
    } else if (period === '3m') {
      startDate.setDate(now.getDate() - 90);
    }

    const body = {
      startDate: startDate.toISOString().split('T')[0],
      endDate: now.toISOString().split('T')[0],
      timeUnit: period === '1d' ? 'hour' : 'date',
      keywordGroups: [
        {
          groupName: keyword,
          keywords: [keyword]
        }
      ],
      device: '',
      ages: [],
      gender: ''
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Naver-Client-Id': NAVER_CLIENT_ID,
        'X-Naver-Client-Secret': NAVER_CLIENT_SECRET
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      console.error('[NaverTrends] API 오류:', response.status, response.statusText);
      return null;
    }

    const data = await response.json();
    return data.results?.[0]?.data || null;
  } catch (error) {
    console.error('[NaverTrends] 요청 실패:', error.message);
    return null;
  }
}

/**
 * 카테고리별 상위 키워드의 평균 검색량 계산
 * @param {string} category - 업종
 * @returns {Promise<number>} 평균 검색량 점수 (0~100)
 */
export async function calculateTrendScore(category) {
  const keywords = categoryToKeywords[category] || categoryToKeywords.기타;
  let totalScore = 0;

  for (const keyword of keywords.slice(0, 3)) {
    const trendData = await fetchNaverTrendData(keyword, '1w');
    if (trendData && trendData.length > 0) {
      const avgRatio = trendData.reduce((sum, item) => sum + (item.ratio || 0), 0) / trendData.length;
      totalScore += avgRatio;
    }
  }

  return Math.min(100, (totalScore / Math.min(3, keywords.length)) * 100);
}

export default {
  fetchNaverTrendData,
  calculateTrendScore,
  categoryToKeywords
};
