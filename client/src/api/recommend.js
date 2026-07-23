import api from './client.js';
import { normalize } from './bakeries.js';

// count/꼭 넣고 싶은 곳/좋아하는 빵(다중 선택)/커피 페어링 조건으로 서버가 빵집 선정 + 동선 계산까지 끝낸 결과를 그대로 받는다.
export async function fetchRecommendation({ origin, count, mustIncludeId, styles, wantsCoffee }) {
  const res = await api.post('/recommend', { origin, count, mustIncludeId, styles, wantsCoffee });
  const { bakeries, routes } = res.data.data;
  return { bakeries: bakeries.map(normalize), routes };
}
