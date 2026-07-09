// 냉장고 화면(FridgePage)에서 고르는 대표 재료 칩 목록.
// matchNames: mockRecipes.js의 ingredients[].name과 실제로 일치하는 이름들 — 칩 하나가 여러 표기(밥/즉석밥/쌀)를 묶는다.
// 새 레시피를 추가할 때 재료명이 여기 없으면 매칭이 안 되므로, 대표 재료라면 matchNames에 표기를 추가할 것.
export const fridgeIngredients = [
  { id: 'egg', label: '계란', emoji: '🥚', matchNames: ['계란'] },
  { id: 'kimchi', label: '김치', emoji: '🥬', matchNames: ['신김치'] },
  { id: 'tofu', label: '두부', emoji: '🧈', matchNames: ['두부', '순두부'] },
  { id: 'pork', label: '돼지고기', emoji: '🥓', matchNames: ['돼지고기'] },
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
]
