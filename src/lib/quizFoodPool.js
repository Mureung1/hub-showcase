// FR-17 — 식단 퀴즈 대상 음식 풀. foodData.js의 canonical 표준명(사진 분석용으로 이미 검증된 목록)
// 중 **plausible.calories(사람이 검증한 현실 칼로리 범위)가 정의된 항목만** 골랐다 — 그 범위의
// 중앙값을 server/nutrition/foodLookup.js의 findByCaloriesNear가 목표 칼로리로 우선 신뢰하기 때문에
// (DB 원본 1인분 칼로리는 표본 편차가 커서 신뢰하지 않음), 여기 없는 음식(예: 김치찌개/된장찌개/
// 부대찌개/파전 — foodData.js가 "찌개류는 편차가 커 칼로리를 의도적으로 비워둠"이라 명시)은 넣지
// 않는다. 이 이름들은 server/nutrition/foodLookup.js의 lookupFood가 exact/alias로 바로 찾을 수 있어
// /api/quiz/calorie-neighbors가 항상 결과를 돌려준다.
export const QUIZ_FOOD_POOL = [
  '비빔밥',
  '볶음밥',
  '국밥',
  '카레라이스',
  '짜장면',
  '짬뽕',
  '라면',
  '냉면',
  '칼국수',
  '우동',
  '탕수육',
  '감자탕',
  '갈비탕',
  '설렁탕',
  '미역국',
  '삼겹살',
  '제육볶음',
  '불고기',
  '돈까스',
  '떡볶이',
  '김밥',
  '순대',
  '만두',
  '치킨',
]
