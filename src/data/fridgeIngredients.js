// 냉장고 화면(FridgePage)에서 고르는 대표 재료 칩 목록.
// matchNames: mockRecipes.js의 ingredients[].name과 실제로 일치하는 이름들 — 칩 하나가 여러 표기(밥/즉석밥/쌀)를 묶는다.
// 새 레시피를 추가할 때 재료명이 여기 없으면 매칭이 안 되므로, 대표 재료라면 matchNames에 표기를 추가할 것.
// group: 두부/돼지고기/소고기처럼 여러 변형(칩)이 있는 재료를 검색에서 한 번에 찾을 수 있게 묶는 상위 이름
// (예: "두부"로 검색해도 두부·순두부 칩이 둘 다 나옴). 검색 매칭 로직은 src/data/ingredientSearch.js 참고.
// category: 냉장고 화면에서 섹션 헤더로 묶어 보여주는 카테고리 — INGREDIENT_CATEGORIES 참고.
// category가 'seasoning'인 항목(조미료)은 거의 모든 레시피에 공통으로 들어가 있어서, 홈 화면 추천 매칭에 그대로 쓰면
// 실제로 가진 재료와 상관없이 추천 목록이 조미료 하나만으로 확 늘어나 버린다(예: 42개 중 28개 레시피가 조미료를 씀).
// 그래서 Home.jsx가 추천용 matchNames를 만들 때는 이 카테고리를 제외하고, RecipeDetailPage.jsx의 보유/구매 필요 표시에는
// 그대로 포함시킨다 — 자세한 이유는 두 파일의 관련 주석 참고.
// 조미료는 자취생 대부분이 기본으로 갖고 있다고 가정하고 기본 선택(체크) 상태로 시작한다 — src/data/fridgeStorage.js 참고.

// 냉장고 화면에 표시되는 섹션 순서 — FridgePage가 이 순서대로 재료를 묶어서 렌더링한다.
export const INGREDIENT_CATEGORIES = [
  { id: 'vegetable', label: '채소' },
  { id: 'meat', label: '고기' },
  { id: 'seafood', label: '해산물' },
  { id: 'processed', label: '가공식품' },
  { id: 'noodle-grain', label: '면·곡물' },
  { id: 'etc', label: '기타' },
  { id: 'seasoning', label: '조미료' },
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

  // 고기
  { id: 'pork-neck', label: '목살', emoji: '🐷', matchNames: ['목살'], group: '돼지고기', category: 'meat' },
  { id: 'pork-belly', label: '삼겹살', emoji: '🥓', matchNames: ['삼겹살'], group: '돼지고기', category: 'meat' },
  { id: 'beef-bulgogi', label: '불고기용소고기', emoji: '🥩', matchNames: ['불고기용소고기'], group: '소고기', category: 'meat' },
  { id: 'beef-ground', label: '다짐소고기', emoji: '🍖', matchNames: ['다짐소고기'], group: '소고기', category: 'meat' },
  { id: 'bacon', label: '베이컨', emoji: '🥓', matchNames: ['베이컨'], category: 'meat' },
  { id: 'chicken-breast', label: '닭가슴살', emoji: '🍗', matchNames: ['닭가슴살'], category: 'meat' },

  // 해산물
  { id: 'shrimp', label: '새우', emoji: '🍤', matchNames: ['새우'], category: 'seafood' },
  { id: 'squid', label: '오징어', emoji: '🦑', matchNames: ['오징어'], category: 'seafood' },
  { id: 'mackerel', label: '고등어', emoji: '🐟', matchNames: ['고등어'], category: 'seafood' },
  { id: 'salmon', label: '연어', emoji: '🍣', matchNames: ['연어'], category: 'seafood' },
  { id: 'shellfish', label: '조개류', emoji: '🦪', matchNames: ['조개류'], category: 'seafood' },
  { id: 'kelp', label: '다시마', emoji: '🍀', matchNames: ['다시마'], category: 'seafood' },

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
  { id: 'cooking-oil', label: '식용유', emoji: '🍶', matchNames: ['식용유'], category: 'etc' },
  { id: 'olive-oil', label: '올리브유', emoji: '🫒', matchNames: ['올리브유'], category: 'etc' },
  { id: 'sesame-oil', label: '참기름', emoji: '🍶', matchNames: ['참기름'], category: 'etc' },

  // 조미료 — 홈 추천 매칭에서는 제외되고 레시피 상세의 보유/구매 필요 표시에만 쓰임 (위 주석 참고).
  // 기름류(식용유·올리브유·참기름)는 "조미료"라 부르기 애매해서 위 "기타"로 뺐다.
  { id: 'salt', label: '소금', emoji: '🧂', matchNames: ['소금'], category: 'seasoning' },
  { id: 'sugar', label: '설탕', emoji: '🫙', matchNames: ['설탕'], category: 'seasoning' },
  { id: 'soy-sauce', label: '간장', emoji: '🍶', matchNames: ['간장'], category: 'seasoning' },
  { id: 'soup-soy-sauce', label: '국간장', emoji: '🍶', matchNames: ['국간장'], category: 'seasoning' },
  { id: 'vinegar', label: '식초', emoji: '🧪', matchNames: ['식초'], category: 'seasoning' },
  { id: 'corn-syrup', label: '물엿', emoji: '🍯', matchNames: ['물엿'], category: 'seasoning' },
  { id: 'red-pepper-powder', label: '고춧가루', emoji: '🌶️', matchNames: ['고춧가루'], category: 'seasoning' },
  { id: 'mayo', label: '마요네즈', emoji: '🥫', matchNames: ['마요네즈'], category: 'seasoning' },
  { id: 'gochujang', label: '고추장', emoji: '🌶️', matchNames: ['고추장'], category: 'seasoning' },
  { id: 'doenjang', label: '된장', emoji: '🫘', matchNames: ['된장'], category: 'seasoning' },
  { id: 'pepper', label: '후추', emoji: '🧂', matchNames: ['후추'], category: 'seasoning' },
  { id: 'oyster-sauce', label: '굴소스', emoji: '🫙', matchNames: ['굴소스'], category: 'seasoning' },
  { id: 'chicken-stock', label: '치킨스톡', emoji: '🥫', matchNames: ['치킨스톡'], category: 'seasoning' },
]

// 조미료는 자취생 대부분이 기본으로 갖고 있다고 가정하고, 냉장고 화면에 처음 들어왔을 때(저장된 선택이 없을 때) 기본으로 체크해둔다.
export const DEFAULT_SEASONING_IDS = fridgeIngredients
  .filter((ingredient) => ingredient.category === 'seasoning')
  .map((ingredient) => ingredient.id)

// 부족 재료 개수를 셀 때 조미료를 통째로 제외하기 위한 이름 목록 — selectors.js의 groupRecipesByMissingIngredients 참고.
// 조미료는 체크 여부와 무관하게 부족으로 잡지 않는다(냉장고 체크와 상관없이 자취생 대부분 갖고 있다고 보는 게 자연스러워서).
export const SEASONING_MATCH_NAMES = fridgeIngredients
  .filter((ingredient) => ingredient.category === 'seasoning')
  .flatMap((ingredient) => ingredient.matchNames)
