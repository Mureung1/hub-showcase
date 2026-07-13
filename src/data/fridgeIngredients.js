// 냉장고 화면(FridgePage)에서 고르는 대표 재료 칩 목록.
// matchNames: mockRecipes.js의 ingredients[].name과 실제로 일치하는 이름들 — 칩 하나가 여러 표기(밥/즉석밥/쌀)를 묶는다.
// 새 레시피를 추가할 때 재료명이 여기 없으면 매칭이 안 되므로, 대표 재료라면 matchNames에 표기를 추가할 것.
// group: 두부/돼지고기/소고기처럼 여러 변형(칩)이 있는 재료를 검색에서 한 번에 찾을 수 있게 묶는 상위 이름
// (예: "두부"로 검색해도 두부·순두부 칩이 둘 다 나옴). 검색 매칭 로직은 src/data/ingredientSearch.js 참고.
// category: 냉장고 화면에서 섹션 헤더로 묶어 보여주는 카테고리 — INGREDIENT_CATEGORIES 참고.
// 거의 모든 레시피에 공통으로 들어가는 범용 조미료(소금·설탕·식용유·간장·참기름·식초·물엿·고춧가루·국간장·올리브유·마요네즈 등)는
// 있으나 없으나 매칭 결과가 똑같아져서 신호가 없으므로 칩으로 만들지 않는다.

// 냉장고 화면에 표시되는 섹션 순서 — FridgePage가 이 순서대로 재료를 묶어서 렌더링한다.
export const INGREDIENT_CATEGORIES = [
  { id: 'vegetable', label: '채소' },
  { id: 'meat-seafood', label: '고기·해산물' },
  { id: 'processed', label: '가공식품' },
  { id: 'noodle-grain', label: '면·곡물' },
  { id: 'etc', label: '기타' },
]

export const fridgeIngredients = [
  // 채소
  { id: 'green-onion', label: '대파', emoji: '🌿', matchNames: ['대파'], category: 'vegetable' },
  { id: 'onion', label: '양파', emoji: '🧅', matchNames: ['양파'], category: 'vegetable' },
  { id: 'garlic', label: '마늘', emoji: '🧄', matchNames: ['마늘', '다진마늘'], category: 'vegetable' },
  { id: 'potato', label: '감자', emoji: '🥔', matchNames: ['감자'], category: 'vegetable' },
  { id: 'carrot', label: '당근', emoji: '🥕', matchNames: ['당근'], category: 'vegetable' },
  { id: 'zucchini', label: '애호박', emoji: '🟢', matchNames: ['애호박'], category: 'vegetable' },
  { id: 'bean-sprout', label: '콩나물', emoji: '🌱', matchNames: ['콩나물'], category: 'vegetable' },
  { id: 'spinach', label: '시금치', emoji: '🍃', matchNames: ['시금치'], category: 'vegetable' },
  { id: 'radish', label: '무', emoji: '🫚', matchNames: ['무'], category: 'vegetable' },
  { id: 'cucumber', label: '오이', emoji: '🥒', matchNames: ['오이'], category: 'vegetable' },
  { id: 'tomato', label: '토마토', emoji: '🍅', matchNames: ['토마토', '토마토소스'], category: 'vegetable' },
  { id: 'lettuce', label: '양상추', emoji: '🥗', matchNames: ['양상추'], category: 'vegetable' },

  // 고기·해산물
  { id: 'pork-neck', label: '목살', emoji: '🐷', matchNames: ['목살'], group: '돼지고기', category: 'meat-seafood' },
  { id: 'pork-belly', label: '삼겹살', emoji: '🥓', matchNames: ['삼겹살'], group: '돼지고기', category: 'meat-seafood' },
  { id: 'beef-bulgogi', label: '불고기용소고기', emoji: '🥩', matchNames: ['불고기용소고기'], group: '소고기', category: 'meat-seafood' },
  { id: 'beef-ground', label: '다짐소고기', emoji: '🍖', matchNames: ['다짐소고기'], group: '소고기', category: 'meat-seafood' },
  { id: 'shrimp', label: '새우', emoji: '🍤', matchNames: ['새우'], category: 'meat-seafood' },
  { id: 'squid', label: '오징어', emoji: '🦑', matchNames: ['오징어'], category: 'meat-seafood' },
  { id: 'bacon', label: '베이컨', emoji: '🥓', matchNames: ['베이컨'], category: 'meat-seafood' },

  // 가공식품
  { id: 'kimchi', label: '김치', emoji: '🥬', matchNames: ['신김치'], category: 'processed' },
  { id: 'spam', label: '스팸·햄', emoji: '🥫', matchNames: ['스팸', '햄'], category: 'processed' },
  { id: 'tuna', label: '참치캔', emoji: '🐟', matchNames: ['참치캔'], category: 'processed' },
  { id: 'fish-cake', label: '어묵', emoji: '🍢', matchNames: ['어묵'], category: 'processed' },
  { id: 'sausage', label: '소시지', emoji: '🌭', matchNames: ['소시지'], category: 'processed' },
  { id: 'cheese', label: '치즈', emoji: '🧀', matchNames: ['치즈'], category: 'processed' },

  // 면·곡물
  { id: 'rice', label: '밥', emoji: '🍚', matchNames: ['밥', '즉석밥', '쌀'], category: 'noodle-grain' },
  { id: 'ramyeon', label: '라면', emoji: '🍜', matchNames: ['라면사리', '신라면', '짜파게티', '너구리', '육개장사발면'], category: 'noodle-grain' },
  { id: 'bread', label: '식빵', emoji: '🍞', matchNames: ['식빵'], category: 'noodle-grain' },
  { id: 'spaghetti', label: '스파게티면', emoji: '🍝', matchNames: ['스파게티면'], category: 'noodle-grain' },
  { id: 'udon', label: '우동면', emoji: '🍜', matchNames: ['우동면'], category: 'noodle-grain' },
  { id: 'glass-noodle', label: '당면', emoji: '🥢', matchNames: ['당면'], category: 'noodle-grain' },

  // 기타
  { id: 'egg', label: '계란', emoji: '🥚', matchNames: ['계란'], category: 'etc' },
  { id: 'tofu-regular', label: '두부', emoji: '🧈', matchNames: ['두부'], group: '두부', category: 'etc' },
  { id: 'tofu-soft', label: '순두부', emoji: '🥣', matchNames: ['순두부'], group: '두부', category: 'etc' },
]
