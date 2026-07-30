// 리텐션 강화 v4 — 식단 퀴즈를 "○○와 칼로리가 비슷한 음식은?"(계산 기반, foodDB.json 1인분 칼로리
// 비교) 방식에서 누구나 아는 식재료로 만든 쉬운 영양 상식 퀴즈로 전면 교체했다. foodDB.json에는
// 비타민/칼슘/철분 같은 미량영양소 필드 자체가 없어(calories/protein/carbs/fat/fiber/sodium 6개뿐)
// 계산으로는 만들 수 없다 — quizFoodPool.js/coupangProducts.js와 같은 관행대로, 대표적이고 순위가
// 뚜렷한(헷갈리지 않는) 4지선다만 손수 큐레이션했다. 정확한 mg/g 수치가 아니라 "상대적으로 무엇이
// 더/덜한가"만 성립하면 되도록 골랐다 — 배포 전 식약처 식품영양성분DB로 스팟체크를 권장한다.
//
// correctIndex는 choices 배열 안에서의 위치일 뿐, 실제 노출 순서는 nutritionTrivia.js가 매일
// 사용자별로 다시 섞는다(항상 같은 자리에 정답이 있으면 순서만 외워도 맞힐 수 있으므로).
export const NUTRITION_TRIVIA_POOL = [
  { id: 'vitc-1', category: 'vitaminC', question: '이 중 비타민C가 가장 많은 것은?', choices: ['레몬', '우유', '식초', '흰쌀밥'], correctIndex: 0 },
  { id: 'vitc-2', category: 'vitaminC', question: '이 중 비타민C가 가장 많은 것은?', choices: ['파프리카', '감자', '당근', '양파'], correctIndex: 0 },
  { id: 'vitc-3', category: 'vitaminC', question: '이 중 비타민C가 가장 많은 것은?', choices: ['키위', '바나나', '식빵', '두부'], correctIndex: 0 },
  { id: 'calcium-1', category: 'calcium', question: '이 중 칼슘이 가장 많은 것은?', choices: ['멸치', '닭가슴살', '사과', '흰쌀밥'], correctIndex: 0 },
  { id: 'calcium-2', category: 'calcium', question: '이 중 칼슘이 가장 많은 것은?', choices: ['우유', '콜라', '오렌지주스', '커피'], correctIndex: 0 },
  { id: 'calcium-3', category: 'calcium', question: '이 중 칼슘이 가장 많은 것은?', choices: ['치즈', '사이다', '식혜', '커피'], correctIndex: 0 },
  { id: 'protein-1', category: 'protein', question: '이 중 단백질이 가장 많은 것은?', choices: ['닭가슴살', '오이', '상추', '사과'], correctIndex: 0 },
  { id: 'protein-2', category: 'protein', question: '이 중 단백질이 가장 많은 것은?', choices: ['두부', '감자', '당근', '바나나'], correctIndex: 0 },
  { id: 'protein-3', category: 'protein', question: '이 중 단백질이 가장 많은 것은?', choices: ['계란', '수박', '오이', '식빵'], correctIndex: 0 },
  { id: 'sodium-1', category: 'sodium', question: '이 중 나트륨이 가장 적은 것은?', choices: ['바나나', '라면', '김치', '젓갈'], correctIndex: 0 },
  { id: 'sodium-2', category: 'sodium', question: '이 중 나트륨이 가장 적은 것은?', choices: ['사과', '된장', '간장', '햄'], correctIndex: 0 },
  { id: 'iron-1', category: 'iron', question: '이 중 철분이 가장 많은 것은?', choices: ['소고기', '우유', '두부', '바나나'], correctIndex: 0 },
  { id: 'iron-2', category: 'iron', question: '이 중 철분이 가장 많은 것은?', choices: ['시금치', '양상추', '오이', '수박'], correctIndex: 0 },
  { id: 'potassium-1', category: 'potassium', question: '이 중 칼륨이 가장 많은 것은?', choices: ['바나나', '흰쌀밥', '식빵', '설탕'], correctIndex: 0 },
  { id: 'fiber-1', category: 'fiber', question: '이 중 식이섬유가 가장 많은 것은?', choices: ['고구마', '흰쌀밥', '우유', '계란'], correctIndex: 0 },
  { id: 'fiber-2', category: 'fiber', question: '이 중 식이섬유가 가장 많은 것은?', choices: ['현미밥', '흰쌀밥', '식빵', '국수'], correctIndex: 0 },
  { id: 'sugar-1', category: 'sugar', question: '이 중 당류가 가장 적은 것은?', choices: ['오이', '콜라', '사탕', '초콜릿'], correctIndex: 0 },
  { id: 'sugar-2', category: 'sugar', question: '이 중 당류가 가장 많은 것은?', choices: ['꿀', '두부', '계란', '닭가슴살'], correctIndex: 0 },
  { id: 'fat-1', category: 'fat', question: '이 중 지방이 가장 많은 것은?', choices: ['삼겹살', '닭가슴살', '두부', '흰쌀밥'], correctIndex: 0 },
  { id: 'fat-2', category: 'fat', question: '이 중 지방이 가장 적은 것은?', choices: ['닭가슴살', '삼겹살', '베이컨', '치즈'], correctIndex: 0 },
  { id: 'calorie-1', category: 'calorie', question: '이 중 칼로리가 가장 낮은 것은?', choices: ['오이', '초콜릿', '치킨', '피자'], correctIndex: 0 },
  { id: 'calorie-2', category: 'calorie', question: '이 중 칼로리가 가장 높은 것은?', choices: ['튀김', '두부', '오이', '상추'], correctIndex: 0 },
  { id: 'water-1', category: 'water', question: '이 중 수분 함량이 가장 높은 것은?', choices: ['수박', '식빵', '치즈', '땅콩'], correctIndex: 0 },
  { id: 'water-2', category: 'water', question: '이 중 수분 함량이 가장 높은 것은?', choices: ['오이', '견과류', '초콜릿', '식빵'], correctIndex: 0 },
]
