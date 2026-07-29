// 리텐션 강화 v4 — 커스텀 조합 빌더(FR-19)의 재료 데이터. 예전엔 식약처 DB(server/data/foodDB.json)를
// 그대로 검색해 썼지만, 그 DB는 전부 "완성된 한 그릇/한 개" 레코드라(예: 김치찌개 = 국+건더기 통째로
// 200g 1개 레코드) 실제 모듈형 커스텀(라면에 치즈 얹기, 우동에 새우튀김 추가하기 같은 맥도날드/
// 서브웨이식 "베이스+토핑+사이드+음료" 조합)을 지원할 델타 데이터(치즈만 추가/해물만 추가 같은 부분
// 재료, 칠성사이다·코카콜라 같은 구체적 캔/병 음료)가 전혀 없다 — coupangProducts.js/
// quizFoodPool.js처럼 손수 큐레이션한 참고용 추정치로 새로 만들었다(정확한 mg/g 수치가 아니라
// 상대적인 크기감이 맞는 선에서 골랐고, 실제 서비스 전 식약처 식품영양성분DB로 스팟체크를 권장한다).
//
// 각 항목은 comboBuilder.js의 buildComboAnalysis/scaleNutrients가 그대로 기대하는 모양
// ({name, nutrients(baseQuantity=100 기준), baseQuantity, servingGrams})이라 그 로직은 무수정이다.
const BASE_QUANTITY = 100

function ingredient(name, servingGrams, nutrients) {
  return { name, baseQuantity: BASE_QUANTITY, servingGrams, nutrients }
}

// 베이스 — 면/밥/빵. 1회 제공량(servingGrams)은 일반적인 1인분 실사용량 기준(면사리 1개, 공기밥 1공기 등).
const BASE = [
  ingredient('라면사리', 120, { calories: 480, protein: 8, carbs: 66, fat: 17, fiber: 2, sodium: 700 }),
  ingredient('우동면', 200, { calories: 110, protein: 3, carbs: 22, fat: 0.5, fiber: 1, sodium: 350 }),
  ingredient('스파게티면', 180, { calories: 158, protein: 5.8, carbs: 31, fat: 0.9, fiber: 1.8, sodium: 5 }),
  ingredient('공기밥', 210, { calories: 143, protein: 2.5, carbs: 31, fat: 0.3, fiber: 0.3, sodium: 2 }),
  ingredient('잡곡밥', 210, { calories: 150, protein: 3.5, carbs: 32, fat: 0.8, fiber: 2.0, sodium: 3 }),
  ingredient('식빵', 35, { calories: 266, protein: 9, carbs: 50, fat: 3.5, fiber: 2.5, sodium: 460 }),
  ingredient('버거번', 50, { calories: 280, protein: 9, carbs: 50, fat: 5, fiber: 2, sodium: 480 }),
]

// 토핑 — 치즈/고기 추가/해물 추가. servingGrams는 "한 번 추가할 때"의 통상적인 소분량.
const TOPPING = [
  ingredient('슬라이스 치즈 1장', 20, { calories: 330, protein: 18, carbs: 4, fat: 27, fiber: 0, sodium: 1200 }),
  ingredient('모짜렐라 치즈 추가', 30, { calories: 280, protein: 22, carbs: 2, fat: 21, fiber: 0, sodium: 550 }),
  ingredient('차돌박이 추가', 50, { calories: 400, protein: 15, carbs: 0, fat: 38, fiber: 0, sodium: 55 }),
  ingredient('불고기 추가', 80, { calories: 190, protein: 17, carbs: 8, fat: 10, fiber: 0.5, sodium: 480 }),
  ingredient('제육 추가', 80, { calories: 220, protein: 18, carbs: 9, fat: 13, fiber: 1, sodium: 520 }),
  ingredient('새우튀김 추가', 40, { calories: 250, protein: 12, carbs: 20, fat: 14, fiber: 0.5, sodium: 380 }),
  ingredient('오징어링 추가', 50, { calories: 260, protein: 11, carbs: 22, fat: 14, fiber: 0.5, sodium: 420 }),
  ingredient('계란후라이 추가', 50, { calories: 196, protein: 13.6, carbs: 0.8, fat: 15, fiber: 0, sodium: 190 }),
]

// 국물 — 찌개 국물만 사이드로(완성 요리 한 그릇이 아니라 "곁들이는 국물" 개념).
const SOUP = [
  ingredient('김치찌개 국물', 200, { calories: 45, protein: 3, carbs: 3, fat: 2, fiber: 1, sodium: 480 }),
  ingredient('된장찌개 국물', 200, { calories: 55, protein: 4, carbs: 4, fat: 2.5, fiber: 1.5, sodium: 460 }),
  ingredient('순두부찌개 국물', 200, { calories: 60, protein: 5, carbs: 3, fat: 3, fiber: 0.8, sodium: 500 }),
]

// 음료 — 구체적인 캔/병 용량으로 지정(수량 스테퍼가 항목당 고정 용량을 가정하므로, 같은 제품의 캔/병
// 용량은 별도 항목으로 등록한다).
const DRINK = [
  ingredient('칠성사이다 1캔(250ml)', 250, { calories: 44, protein: 0, carbs: 11, fat: 0, fiber: 0, sodium: 8 }),
  ingredient('코카콜라 1캔(250ml)', 250, { calories: 42, protein: 0, carbs: 10.6, fat: 0, fiber: 0, sodium: 3 }),
  ingredient('코카콜라 1병(500ml)', 500, { calories: 42, protein: 0, carbs: 10.6, fat: 0, fiber: 0, sodium: 3 }),
  ingredient('펩시 1캔(250ml)', 250, { calories: 45, protein: 0, carbs: 11.5, fat: 0, fiber: 0, sodium: 5 }),
  ingredient('제로콜라 1캔(250ml)', 250, { calories: 0.4, protein: 0, carbs: 0.1, fat: 0, fiber: 0, sodium: 10 }),
  ingredient('환타 오렌지 1캔(250ml)', 250, { calories: 46, protein: 0, carbs: 11.6, fat: 0, fiber: 0, sodium: 10 }),
]

export const COMBO_INGREDIENTS = { base: BASE, topping: TOPPING, soup: SOUP, drink: DRINK }
