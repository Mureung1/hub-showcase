// 광고 목업 데이터. 실제 광고 네트워크/제휴 링크가 아직 정해지지 않아, 인터페이스만 실제 형태로 맞춰
// 두고 값은 자리표시자로 채운다 — 나중에 실제 제휴 링크로 이 파일의 값만 바꾸면 되고, 화면(AdCard 등)은
// 손댈 필요가 없다. link는 전부 실제로 연결되지 않는 "#" 자리표시자다.
//
// 건강기능식품 광고 문구는 의료광고법/식품표시광고법을 의식해 "치료"/"예방"/"효과 보장" 같은 과장·의학적
// 효능 단정 표현을 쓰지 않는다(예: "장 건강에 도움을 줄 수 있어요" O, "장염을 치료해요" X).

// 부족 영양소 key -> 보충제 광고 매핑. Result.jsx가 top3Rows[0].key로 조회한다.
export const SUPPLEMENT_ADS = {
  protein: { name: '고단백 프로틴 쉐이크', note: '단백질 보충에 도움을 줄 수 있어요', link: '#' },
  fiber: { name: '식이섬유 보충제', note: '식이섬유 섭취에 도움을 줄 수 있어요', link: '#' },
  calories: { name: '고열량 영양 쉐이크', note: '부족한 열량 보충에 도움을 줄 수 있어요', link: '#' },
  carbs: { name: '에너지 보충 바', note: '탄수화물 보충에 도움을 줄 수 있어요', link: '#' },
  fat: { name: '오메가3 캡슐', note: '필수 지방산 섭취에 도움을 줄 수 있어요', link: '#' },
  sodium: null, // 나트륨은 "넘치면 안 되는 한도"라 보충 광고 대상이 아니다.
}

// 주변 식당 추천 목록에 섞어 넣을 광고 식당(목업). 실제 검색 결과가 아니라 이 배열의 항목을
// MapPage.jsx가 places 배열의 4번째 자리에 고정으로 끼워 넣는다.
export const SPONSORED_RESTAURANTS = [
  {
    place_name: '건강한 한끼 (광고)',
    road_address_name: '제휴 매장',
    category_name: '건강식',
    place_url: '#',
    isAd: true,
  },
]

// 광고 클릭 수를 로컬에 기록한다(추후 분석용, 서버 전송 없음). storage.js를 쓰지 않는 이유:
// 이 값은 사용자별로 의미 있는 데이터가 아니라 "이 브라우저에서 어떤 광고가 몇 번 클릭됐는지"만
// 세는 순수 카운터라, guest/로그인 구분이나 dataStore를 거칠 필요가 없다.
const CLICK_LOG_KEY = 'mealyze:ad-clicks'

export function trackAdClick(adId) {
  try {
    const raw = localStorage.getItem(CLICK_LOG_KEY)
    const counts = raw ? JSON.parse(raw) : {}
    counts[adId] = (counts[adId] || 0) + 1
    localStorage.setItem(CLICK_LOG_KEY, JSON.stringify(counts))
  } catch (err) {
    console.error('ad click tracking failed:', err)
  }
}
