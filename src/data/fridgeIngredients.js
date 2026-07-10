// 냉장고 화면(FridgePage)에서 고르는 대표 재료 칩 목록.
// matchNames: mockRecipes.js의 ingredients[].name과 실제로 일치하는 이름들 — 칩 하나가 여러 표기(밥/즉석밥/쌀)를 묶는다.
// 새 레시피를 추가할 때 재료명이 여기 없으면 매칭이 안 되므로, 대표 재료라면 matchNames에 표기를 추가할 것.
// 거의 모든 레시피에 공통으로 들어가는 범용 조미료(소금·설탕·식용유·간장·참기름·식초·물엿·고춧가루·국간장·올리브유·마요네즈 등)는
// 있으나 없으나 매칭 결과가 똑같아져서 신호가 없으므로 칩으로 만들지 않는다.
export const fridgeIngredients = [
  { id: 'egg', label: '계란', emoji: '🥚', matchNames: ['계란'] },
  { id: 'kimchi', label: '김치', emoji: '🥬', matchNames: ['신김치'] },
  { id: 'tofu', label: '두부', emoji: '🧈', matchNames: ['두부', '순두부'] },
  { id: 'pork', label: '돼지고기', emoji: '🐷', matchNames: ['돼지고기'] },
  { id: 'beef', label: '소고기', emoji: '🥩', matchNames: ['소고기'] },
  { id: 'green-onion', label: '대파', emoji: '🌿', matchNames: ['대파'] },
  { id: 'onion', label: '양파', emoji: '🧅', matchNames: ['양파'] },
  { id: 'garlic', label: '마늘', emoji: '🧄', matchNames: ['마늘', '다진마늘'] },
  { id: 'potato', label: '감자', emoji: '🥔', matchNames: ['감자'] },
  { id: 'carrot', label: '당근', emoji: '🥕', matchNames: ['당근'] },
  { id: 'rice', label: '밥', emoji: '🍚', matchNames: ['밥', '즉석밥', '쌀'] },
  { id: 'ramyeon', label: '라면', emoji: '🍜', matchNames: ['라면사리', '신라면', '짜파게티', '너구리', '육개장사발면'] },
  { id: 'tuna', label: '참치캔', emoji: '🐟', matchNames: ['참치캔'] },
  { id: 'spam', label: '스팸·햄', emoji: '🥫', matchNames: ['스팸', '햄'] },
  { id: 'bread', label: '식빵', emoji: '🍞', matchNames: ['식빵'] },
  { id: 'shrimp', label: '새우', emoji: '🍤', matchNames: ['새우'] },
  { id: 'squid', label: '오징어', emoji: '🦑', matchNames: ['오징어'] },
  { id: 'zucchini', label: '애호박', emoji: '🟢', matchNames: ['애호박'] },
  { id: 'bean-sprout', label: '콩나물', emoji: '🌱', matchNames: ['콩나물'] },
  { id: 'spinach', label: '시금치', emoji: '🍃', matchNames: ['시금치'] },
  { id: 'radish', label: '무', emoji: '🫚', matchNames: ['무'] },
  { id: 'cucumber', label: '오이', emoji: '🥒', matchNames: ['오이'] },
  { id: 'fish-cake', label: '어묵', emoji: '🍢', matchNames: ['어묵'] },
  { id: 'sausage', label: '소시지', emoji: '🌭', matchNames: ['소시지'] },
  { id: 'spaghetti', label: '스파게티면', emoji: '🍝', matchNames: ['스파게티면'] },
  { id: 'tomato', label: '토마토', emoji: '🍅', matchNames: ['토마토', '토마토소스'] },
  { id: 'bacon', label: '베이컨', emoji: '🥓', matchNames: ['베이컨'] },
  { id: 'cheese', label: '치즈', emoji: '🧀', matchNames: ['치즈'] },
  { id: 'lettuce', label: '양상추', emoji: '🥗', matchNames: ['양상추'] },
]
