import api from './client.js';
import { withMockExtras } from '../data/mockBakeryExtras.js';

// 서버는 DB 컬럼명을 그대로(snake_case) 내려주므로, 프론트 관례(camelCase)에 맞게 여기서 한 번만 변환한다.
// 실데이터에 아직 없는 필드(평점/리뷰/카테고리/전화번호)는 컴포넌트 쪽에서 있을 때만 보여주도록 처리.
export function normalize(row) {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    lat: row.lat,
    lng: row.lng,
    menu: row.signature_menu,
    comment: row.comment,
    price: row.price_range,
    openHour: row.open_hour,
    closeHour: row.close_hour,
    closedDays: row.closed_days,
    photoUrl: row.photo_url,
    busy: row.busy_hours,
    hasCoffee: row.has_coffee,
    isFeatured: row.is_featured,
  };
}

export async function fetchBakeries() {
  const res = await api.get('/bakeries');
  // category/priceTier/busyHours는 아직 실데이터가 없어서 임시 목데이터를 붙인다(mockBakeryExtras.js 참고).
  return res.data.data.map(normalize).map(withMockExtras);
}
