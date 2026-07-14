/**
 * @file ingredients.js
 * @description 재료 마스터 데이터 — 총 100가지의 한식/레시피 상용 식재료 정의
 */

const INGREDIENT_LIST = [
  // ── 1. 채소류 (Vegetables - 신선식품) ───────────────────────────────────────
  { id: 'onion', emoji: '🧅', name: '양파', category: 'fresh', defaultUnitLabels: ['1개', '반쪽', '1/4쪽', '소진'], avgShelfLifeDays: { spring: 14, summer: 10, fall: 20, winter: 30 }, role: '국물, 볶음 요리의 달콤하고 풍부한 맛을 더하는 기본 채소예요.', tip: '망에 담아 서늘한 곳에 보관하고, 남은 양파는 랩으로 밀폐하여 냉장 보관하세요.' },
  { id: 'pa', emoji: '🥬', name: '대파', category: 'fresh', defaultUnitLabels: ['한단', '3/4단', '1/2단', '1/4단', '소진'], avgShelfLifeDays: { spring: 10, summer: 7, fall: 12, winter: 14 }, role: '요리에 시원한 단맛และ 알싸한 파향을 불어넣는 양념 채소예요.', tip: '씻어 물기를 완전히 빼고 썰어서 밀폐용기에 담아 냉동 보관하면 요리할 때 편리해요.' },
  { id: 'garlic', emoji: '🧄', name: '마늘', category: 'fresh', defaultUnitLabels: ['20알', '10알', '5알', '소진'], avgShelfLifeDays: { spring: 15, summer: 10, fall: 20, winter: 25 }, role: '한국 음식에 없어서는 안 될 감칠맛과 깊은 풍미를 더해주는 재료예요.', tip: '통마늘은 망에 넣어 서늘한 곳에, 다진 마늘은 소분해서 냉동 보관하는 것이 좋습니다.' },
  { id: 'potato', emoji: '🥔', name: '감자', category: 'fresh', defaultUnitLabels: ['5개', '3개', '1개', '소진'], avgShelfLifeDays: { spring: 20, summer: 10, fall: 20, winter: 30 }, role: '국, 찌개, 볶음, 조림 등 다양하게 변신하는 구수한 전분질 채소예요.', tip: '사과와 함께 신문지에 싸서 그늘지고 서늘한 곳에 보관하면 싹이 나는 것을 늦출 수 있어요.' },
  { id: 'carrot', emoji: '🥕', name: '당근', category: 'fresh', defaultUnitLabels: ['3개', '2개', '1개', '소진'], avgShelfLifeDays: { spring: 14, summer: 10, fall: 14, winter: 20 }, role: '음식의 색감을 살려주고 은은한 단맛을 더해주는 건강한 주황색 채소예요.', tip: '흙을 씻지 않은 채 신문지에 싸서 세워 보관하거나, 씻은 후 물기를 빼고 밀폐 용기에 넣으세요.' },
  { id: 'cabbage', emoji: '🥬', name: '양배추', category: 'fresh', defaultUnitLabels: ['1통', '반통', '1/4통', '소진'], avgShelfLifeDays: { spring: 10, summer: 7, fall: 10, winter: 14 }, role: '아삭아삭한 식감과 달콤한 맛으로 샐러드, 볶음, 쌈 요리에 고루 쓰여요.', tip: '가운데 심지를 파낸 뒤 물을 적신 키친타월을 채워 랩으로 싸서 보관하면 오래 가요.' },
  { id: 'pepper', emoji: '🌶️', name: '풋고추', category: 'fresh', defaultUnitLabels: ['10개', '5개', '2개', '소진'], avgShelfLifeDays: { spring: 7, summer: 5, fall: 7, winter: 10 }, role: '알싸하고 매콤한 맛을 더해 느끼함을 잡아주는 고추예요.', tip: '물기를 제거하고 키친타월에 싸서 지퍼백에 넣어 보관하세요.' },
  { id: 'chili', emoji: '🌶️', name: '청양고추', category: 'fresh', defaultUnitLabels: ['10개', '5개', '2개', '소진'], avgShelfLifeDays: { spring: 7, summer: 5, fall: 7, winter: 10 }, role: '아주 매콤한 칼칼함으로 국물이나 조림에 화끈함을 더하는 포인트예요.', tip: '어슷 썰어 냉동해 두면 찌개 끓일 때 바로 꺼내 쓸 수 있어요.' },
  { id: 'mushroom', emoji: '🍄', name: '표고버섯', category: 'fresh', defaultUnitLabels: ['10개', '5개', '2개', '소진'], avgShelfLifeDays: { spring: 5, summer: 3, fall: 5, winter: 7 }, role: '쫄깃한 식감과 짙은 버섯 향으로 국물의 감칠맛을 내는 건강 재료예요.', tip: '기둥을 떼어내고 갓 부분만 랩으로 싸서 보관하거나, 말려 두면 향이 깊어져요.' },
  { id: 'cucumber', emoji: '🥒', name: '오이', category: 'fresh', defaultUnitLabels: ['3개', '2개', '1개', '소진'], avgShelfLifeDays: { spring: 7, summer: 4, fall: 7, winter: 10 }, role: '수분이 가득하고 청량해 무침이나 샐러드, 냉국에 찰떡인 아삭 채소예요.', tip: '개별적으로 신문지에 싸서 꼭지 부분이 위로 가도록 냉장실 야채칸에 보관하세요.' },
  { id: 'zucchini', emoji: '🥒', name: '애호박', category: 'fresh', defaultUnitLabels: ['2개', '1개', '반개', '소진'], avgShelfLifeDays: { spring: 7, summer: 4, fall: 7, winter: 10 }, role: '된장찌개, 전, 볶음 등에 부드럽게 스며드는 대표적인 한국 애호박이에요.', tip: '물기를 닦고 랩으로 단단하게 밀착해 감싼 후 냉장실에 넣어 보관하세요.' },
  { id: 'beanSprouts', emoji: '🌱', name: '콩나물', category: 'fresh', defaultUnitLabels: ['1봉', '반봉', '소진'], avgShelfLifeDays: { spring: 3, summer: 2, fall: 3, winter: 4 }, role: '아스파라긴산이 풍부하여 숙취 해소용 국이나 고소한 무침에 최고예요.', tip: '밀폐용기에 담아 물을 가득 부은 뒤 보관하고, 매일 물을 갈아주면 5일 이상 신선해요.' },
  { id: 'spinach', emoji: '🥬', name: '시금치', category: 'fresh', defaultUnitLabels: ['1단', '반단', '소진'], avgShelfLifeDays: { spring: 4, summer: 2, fall: 4, winter: 5 }, role: '비타민이 가득하고 달큰고소하여 데쳐서 나물로 무치거나 국에 넣어요.', tip: '씻지 않은 채 키친타월에 싸서 비닐팩에 담아 야채칸에 세워 보관하세요.' },
  { id: 'radish', emoji: '🥬', name: '무', category: 'fresh', defaultUnitLabels: ['1개', '반개', '1/4개', '소진'], avgShelfLifeDays: { spring: 20, summer: 10, fall: 20, winter: 30 }, role: '국물에 들어가면 한없이 시원하고, 졸이면 말랑달콤해지는 다재다능한 채소예요.', tip: '흙이 묻은 채 신문지에 감싸 그늘에 보관하거나, 자른 단면을 랩으로 밀폐하세요.' },
  { id: 'lettuce', emoji: '🥬', name: '상추', category: 'fresh', defaultUnitLabels: ['1봉', '반봉', '소진'], avgShelfLifeDays: { spring: 5, summer: 3, fall: 5, winter: 7 }, role: '고기 구워 먹을 때 쌈으로 즐기는 쌉싸름하고 청량한 잎채소예요.', tip: '씻은 후 물기를 빼고 키친타월을 깐 밀폐용기에 세워서 냉장 보관하세요.' },
  { id: 'sesameLeaf', emoji: '🍃', name: '깻잎', category: 'fresh', defaultUnitLabels: ['30장', '15장', '5장', '소진'], avgShelfLifeDays: { spring: 5, summer: 3, fall: 5, winter: 7 }, role: '특유의 알싸하고 향긋한 향으로 쌈, 조림, 전, 고기 요리 토핑에 널리 쓰여요.', tip: '줄기 끝부분을 물을 약간 적신 키친타월로 감싸 밀폐 보관하면 시들지 않아요.' },
  { id: 'ginger', emoji: '🧄', name: '생강', category: 'fresh', defaultUnitLabels: ['3알', '1알', '소진'], avgShelfLifeDays: { spring: 14, summer: 7, fall: 14, winter: 20 }, role: '알싸하고 톡 쏘는 향으로 육류나 생선의 비린 맛을 잡아주는 천연 향신료예요.', tip: '모래나 흙에 묻어두거나, 다져서 소분한 뒤 냉동 보관하면 두고두고 씁니다.' },
  { id: 'scallion', emoji: '🌱', name: '쪽파', category: 'fresh', defaultUnitLabels: ['1단', '반단', '소진'], avgShelfLifeDays: { spring: 7, summer: 4, fall: 7, winter: 10 }, role: '양념장이나 파전, 각종 무침에 향을 부드럽게 더하는 얇은 대파 사촌이에요.', tip: '신문지에 감싸 분무기로 수분을 준 뒤 채소칸에 세워 보관하세요.' },
  { id: 'broccoli', emoji: '🥦', name: '브로콜리', category: 'fresh', defaultUnitLabels: ['2송이', '1송이', '소진'], avgShelfLifeDays: { spring: 7, summer: 4, fall: 7, winter: 10 }, role: '살짝 데쳐 초장에 찍어 먹거나 볶음 요리에 영양을 채우는 꽃송이 채소예요.', tip: '물기를 닦고 랩으로 감싼 뒤 세워서 냉장 보관하면 노란 꽃이 피는 걸 막아요.' },
  { id: 'eggplant', emoji: '🍆', name: '가지', category: 'fresh', defaultUnitLabels: ['3개', '2개', '1개', '소진'], avgShelfLifeDays: { spring: 7, summer: 4, fall: 7, winter: 10 }, role: '쪄서 무쳐 먹거나 기름에 볶으면 스펀지처럼 고소한 맛을 쭉 빨아들이는 부드러운 채소예요.', tip: '비닐봉지에 담아 냉장 보관하되, 차가운 온도에 민감하므로 상온 보관도 좋습니다.' },
  { id: 'bellPepper', emoji: '🫑', name: '파프리카', category: 'fresh', defaultUnitLabels: ['3개', '2개', '1개', '소진'], avgShelfLifeDays: { spring: 7, summer: 5, fall: 7, winter: 10 }, role: '아삭한 단맛과 알록달록 비비드한 컬러로 샐러드나 볶음 요리를 돋보이게 해요.', tip: '수분이 닿으면 빨리 상하므로 씻지 않고 랩으로 하나씩 감싸 냉장 보관하세요.' },
  { id: 'enoki', emoji: '🍄', name: '팽이버섯', category: 'fresh', defaultUnitLabels: ['3봉', '2봉', '1봉', '소진'], avgShelfLifeDays: { spring: 5, summer: 3, fall: 5, winter: 7 }, role: '오도독 오도독 씹히는 식감이 일품으로 전골, 찌개, 전 등에 잘 어울려요.', tip: '봉지째 뜯지 않고 서늘한 야채칸에 세워서 보관하며, 남은 것은 밀폐 용기에 담아두세요.' },
  { id: 'oysterMushroom', emoji: '🍄', name: '느타리버섯', category: 'fresh', defaultUnitLabels: ['1팩', '반팩', '소진'], avgShelfLifeDays: { spring: 5, summer: 3, fall: 5, winter: 7 }, role: '결대로 찢어서 국이나 잡채, 볶음 요리에 쫄깃한 식감을 주는 대표 버섯이에요.', tip: '수분이 차면 금방 무르므로 키친타월로 감싸 지퍼백에 넣어 보관하세요.' },
  { id: 'sweetPotato', emoji: '🍠', name: '고구마', category: 'fresh', defaultUnitLabels: ['5개', '3개', '1개', '소진'], avgShelfLifeDays: { spring: 20, summer: 10, fall: 20, winter: 30 }, role: '달콤하고 포슬포슬하여 찌거나 굽고, 맛탕으로 해 먹는 영양 간식이에요.', tip: '냉장고에 넣으면 무르기 쉬우므로, 신문지에 펼쳐서 바람이 통하는 상온에 보관하세요.' },
  { id: 'chives', emoji: '🌱', name: '부추', category: 'fresh', defaultUnitLabels: ['1단', '반단', '소진'], avgShelfLifeDays: { spring: 4, summer: 2, fall: 4, winter: 5 }, role: '피를 맑게 해주고 파보다 부드러운 향으로 겉절이, 전, 무침에 고루 어울립니다.', tip: '누르거나 꺾이면 풋내가 나고 빨리 물러지므로 세우거나 가볍게 놓아 보관하세요.' },

  // ── 2. 육류/가금류 (Meats - 신선식품) ─────────────────────────────────────
  { id: 'pork', emoji: '🥩', name: '돼지고기 앞다리', category: 'fresh', defaultUnitLabels: ['300g', '150g', '소진'], avgShelfLifeDays: { spring: 4, summer: 2, fall: 4, winter: 5 }, role: '단백질이 필요한 제육볶음이나 찌개용 기본 돼지고기 부위예요.', tip: '냉장 상태에서는 이틀 안에 드시고, 길어지면 소분하여 냉동 보관하는 편이 안전해요.' },
  { id: 'porkBelly', emoji: '🥓', name: '삼겹살', category: 'fresh', defaultUnitLabels: ['300g', '150g', '소진'], avgShelfLifeDays: { spring: 4, summer: 2, fall: 4, winter: 5 }, role: '기름진 풍미와 쫄깃한 고소함으로 구이나 김치찌개 깊은 맛을 낼 때 써요.', tip: '서로 달라붙지 않게 랩으로 켜켜이 쌓아 밀폐 용기에 담아 보관하세요.' },
  { id: 'beef', emoji: '🥩', name: '소고기 국거리', category: 'fresh', defaultUnitLabels: ['300g', '150g', '소진'], avgShelfLifeDays: { spring: 4, summer: 2, fall: 4, winter: 5 }, role: '소고기뭇국이나 미역국, 장조림에 깊은 감칠맛 육수를 선사하는 소고기예요.', tip: '핏물을 키친타월로 가볍게 닦고 표면에 식용유를 살짝 바르면 신선함이 오래 가요.' },
  { id: 'beefMinced', emoji: '🥩', name: '다진 소고기', category: 'fresh', defaultUnitLabels: ['200g', '100g', '소진'], avgShelfLifeDays: { spring: 3, summer: 2, fall: 3, winter: 4 }, role: '볶음밥, 마파두부, 떡갈비 등 아이들 요리나 양념장에 넓게 사용돼요.', tip: '표면적이 넓어 빨리 상하므로 당장 쓸 분량 외에는 납작하게 눌러 즉시 냉동하세요.' },
  { id: 'chicken', emoji: '🍗', name: '닭고기', category: 'fresh', defaultUnitLabels: ['1마리', '반마리', '소진'], avgShelfLifeDays: { spring: 3, summer: 2, fall: 3, winter: 4 }, role: '닭볶음탕, 삼계탕 등 보양이나 든든한 일품요리를 만들기 위한 메인 육류예요.', tip: '밀폐용기 바닥에 키친타월을 깔고 보관하되 비린내가 나기 전에 빨리 소비하세요.' },
  { id: 'chickenBreast', emoji: '🐔', name: '닭가슴살', category: 'fresh', defaultUnitLabels: ['3팩', '2팩', '1팩', '소진'], avgShelfLifeDays: { spring: 4, summer: 2, fall: 4, winter: 5 }, role: '지방이 적고 담백하여 다이어트 식단이나 샐러드, 냉채에 최고인 단백질원이에요.', tip: '삶은 후 결대로 찢어서 냉동해 두면 필요할 때 샐러드에 바로 올릴 수 있어요.' },
  { id: 'bacon', emoji: '🥓', name: '베이컨', category: 'fresh', defaultUnitLabels: ['1팩', '반팩', '소진'], avgShelfLifeDays: { spring: 14, summer: 7, fall: 14, winter: 21 }, role: '파스타, 볶음밥 등에 들어가면 기름진 불향과 짭짤함으로 풍미를 올려줘요.', tip: '밀봉 상태에서는 기한을 보되, 남은 것은 공기가 안 통하게 이중 지퍼백에 보관하세요.' },

  // ── 3. 수산물/해물 (Seafood - 신선식품) ───────────────────────────────────
  { id: 'squid', emoji: '🦑', name: '오징어', category: 'fresh', defaultUnitLabels: ['2마리', '1마리', '소진'], avgShelfLifeDays: { spring: 2, summer: 1, fall: 2, winter: 3 }, role: '오징어볶음, 해물파전 등에 쫄깃한 식감과 타우린을 더해주는 해물이에요.', tip: '내장과 뼈를 완전히 제거하고 씻은 다음 지퍼백에 밀착하여 즉시 냉동하십시오.' },
  { id: 'seafoodMix', emoji: '🦐', name: '해물믹스', category: 'fresh', defaultUnitLabels: ['1봉', '반봉', '소진'], avgShelfLifeDays: { spring: 30, summer: 20, fall: 30, winter: 45 }, role: '새우, 조개, 홍합 등이 섞여 전이나 파스타, 국물 요리에 바다 맛을 내줘요.', tip: '한 번 해동한 해물은 다시 얼리면 균이 번식하므로 먹을 만큼 꺼내 씻어 바로 사용하세요.' },
  { id: 'shrimp', emoji: '🦐', name: '새우', category: 'fresh', defaultUnitLabels: ['20마리', '10마리', '소진'], avgShelfLifeDays: { spring: 3, summer: 2, fall: 3, winter: 4 }, role: '탱글탱글 씹히며 고소하고 달큰해 감바스나 볶음밥을 고급스럽게 해 줍니다.', tip: '껍질을 까고 꼬리를 살린 상태에서 물기를 닦아 급속 냉동 보관하면 편리해요.' },
  { id: 'clam', emoji: '🐚', name: '바지락 조개', category: 'fresh', defaultUnitLabels: ['1봉', '반봉', '소진'], avgShelfLifeDays: { spring: 2, summer: 1, fall: 2, winter: 3 }, role: '순두부찌개나 칼국수 국물을 끝없이 시원하게 만드는 천연 조미료 같은 조개예요.', tip: '소금물에 담가 검은 봉지를 씌워 해감한 뒤 하루 안에 드시는 것을 추천합니다.' },
  { id: 'anchovy', emoji: '🐟', name: '국물용 멸치', category: 'fresh', defaultUnitLabels: ['1봉', '반봉', '소진'], avgShelfLifeDays: { spring: 60, summer: 45, fall: 60, winter: 90 }, role: '모든 국물 요리의 뼈대를 잡는 감칠맛 나고 시원한 육수용 멸치예요.', tip: '대가리와 내장(똥)을 떼어내고 달군 팬에 살짝 볶아 수분을 날린 후 보관하면 비린 맛이 없어져요.' },
  { id: 'pollack', emoji: '🐟', name: '황태채', category: 'fresh', defaultUnitLabels: ['1봉', '반봉', '소진'], avgShelfLifeDays: { spring: 90, summer: 60, fall: 90, winter: 120 }, role: '황태해장국이나 매콤한 무침으로 식탁을 든든하게 메워주는 구수한 생선살이에요.', tip: '실온에서는 벌레가 꼬일 수 있으므로 밀봉하여 냉동 보관하는 것이 안전합니다.' },
  { id: 'kelp', emoji: '🌿', name: '다시마', category: 'fresh', defaultUnitLabels: ['1봉', '반봉', '소진'], avgShelfLifeDays: { spring: 180, summer: 120, fall: 180, winter: 240 }, role: '멸치와 짝을 이루어 육수에 깊은 감칠맛과 다시마 향을 심어주는 기본 재료예요.', tip: '건조하고 서늘한 그늘에 보관하고 표면의 흰 가루는 먼지가 아니니 안심하고 닦아 쓰세요.' },

  // ── 4. 유제품/알류 (Dairy/Eggs - 신선식품) ──────────────────────────────────
  { id: 'egg', emoji: '🥚', name: '계란', category: 'fresh', defaultUnitLabels: ['6알', '5알', '4알', '3알', '2알', '1알', '소진'], avgShelfLifeDays: { spring: 25, summer: 18, fall: 25, winter: 35 }, role: '프라이, 찜, 베이킹 등 모든 요리를 든든하게 떠받쳐주는 최고의 만능 영양 단백질원이에요.', tip: '물로 씻지 말고 껍질의 둥근 쪽(숨구멍)이 위로 가게 세워 냉장고 안쪽에 두세요.' },
  { id: 'tofu', emoji: '🧊', name: '두부', category: 'fresh', defaultUnitLabels: ['1모', '반모', '소진'], avgShelfLifeDays: { spring: 4, summer: 3, fall: 4, winter: 5 }, role: '찌개에 부드러운 단백질을 채워주는 고소하고 부드러운 콩 재료예요.', tip: '반 모만 쓰고 남았다면, 찬물에 소금을 한 꼬집 풀어 완전히 잠기게 붓고 냉장 보관하세요.' },
  { id: 'milk', emoji: '🥛', name: '우유', category: 'fresh', defaultUnitLabels: ['1000ml', '500ml', '200ml', '소진'], avgShelfLifeDays: { spring: 7, summer: 5, fall: 7, winter: 10 }, role: '부드럽고 고소해 라떼, 카레, 베이킹, 파스타 등의 소스를 완성하는 고소한 우유예요.', tip: '냄새를 쉽게 빨아들이므로 개봉 후에는 뚜껑을 꼭 닫아 냉장 깊숙한 곳에 보관하세요.' },
  { id: 'butter', emoji: '🧈', name: '버터', category: 'fresh', defaultUnitLabels: ['1팩', '반팩', '소진'], avgShelfLifeDays: { spring: 30, summer: 20, fall: 30, winter: 60 }, role: '팬에 둘러 고소한 풍미와 서양식 고급스러운 불향을 낼 때 쓰는 유지류예요.', tip: '녹기 쉬우므로 밀폐 용기에 담아 냉동 보관하고 필요한 만큼 칼로 잘라 쓰세요.' },
  { id: 'cheese', emoji: '🧀', name: '슬라이스 치즈', category: 'fresh', defaultUnitLabels: ['10장', '5장', '2장', '소진'], avgShelfLifeDays: { spring: 30, summer: 20, fall: 30, winter: 45 }, role: '떡볶이, 부대찌개, 토스트 등에 녹여 녹진하고 고소한 짠맛을 더하는 치즈예요.', tip: '포장을 개봉한 후에는 밀폐 용기에 담아 두어야 치즈 가장자리가 딱딱하게 마르지 않아요.' },
  { id: 'mozzarella', emoji: '🧀', name: '모짜렐라 치즈', category: 'fresh', defaultUnitLabels: ['1봉', '반봉', '소진'], avgShelfLifeDays: { spring: 14, summer: 10, fall: 14, winter: 20 }, role: '쭉쭉 늘어나 비주얼을 책임지고 고소함을 극대화하는 피자 치즈예요.', tip: '쉽게 곰팡이가 슬기 때문에 장기 보관 시에는 지퍼백에 얇게 펴서 냉동해 두세요.' },

  // ── 5. 곡류/면류 (Grains/Noodles - 신선식품) ────────────────────────────────
  { id: 'rice', emoji: '🍚', name: '즉석밥', category: 'fresh', defaultUnitLabels: ['6개', '3개', '1개', '소진'], avgShelfLifeDays: { spring: 90, summer: 60, fall: 90, winter: 90 }, role: '요리와 곁들여 먹는 한국인의 든든한 탄수화물 에너지원이에요.', tip: '실온 보관이 가능하나 햇빛이 들지 않고 습하지 않은 건조한 수납장에 두세요.' },
  { id: 'ramen', emoji: '🍜', name: '라면 사리', category: 'fresh', defaultUnitLabels: ['5개', '3개', '1개', '소진'], avgShelfLifeDays: { spring: 90, summer: 60, fall: 90, winter: 90 }, role: '찌개에 넣어 풍성함을 주거나 간단하게 국수를 만들어 먹는 면사리예요.', tip: '밀봉 상태에서 서늘한 곳에 보관하고 유통기한을 주기적으로 확인하세요.' },
  { id: 'somyeon', emoji: '🍜', name: '소면 국수', category: 'fresh', defaultUnitLabels: ['1봉', '반봉', '소진'], avgShelfLifeDays: { spring: 120, summer: 90, fall: 120, winter: 180 }, role: '잔치국수, 비빔국수, 골뱅이무침 등에 매끄럽고 부드러운 국수 가닥이에요.', tip: '습기에 취약하므로 비닐 끝부분을 집게나 밀폐 용기로 꽁꽁 묶어 건조하게 두세요.' },
  { id: 'ricecake', emoji: '🍡', name: '떡볶이 떡', category: 'fresh', defaultUnitLabels: ['1봉', '반봉', '소진'], avgShelfLifeDays: { spring: 7, summer: 4, fall: 7, winter: 10 }, role: '떡볶이나 떡국, 찌개에 들어가 쫀득오도독 씹는 재미를 채워주는 떡이에요.', tip: '공기에 노출되면 딱딱하게 굳고 상하므로 남은 것은 식용유를 발라 지퍼백에 넣어 냉동 보관하세요.' },
  { id: 'glassNoodle', emoji: '🍜', name: '당면', category: 'fresh', defaultUnitLabels: ['1봉', '반봉', '소진'], avgShelfLifeDays: { spring: 180, summer: 120, fall: 180, winter: 240 }, role: '잡채나 갈비탕, 찜닭 국물을 부드럽게 머금어 쫄깃하게 씹히는 전분 면이에요.', tip: '단단하게 밀폐된 서늘하고 건조한 그늘에 보관하면 아주 오래 두고 쓸 수 있습니다.' },

  // ── 6. 양념/조미료 (Seasonings - 가공식품: untracked 추천) ────────────────────
  // 가공식품(processed)은 defaultUnitLabels 와 avgShelfLifeDays 가 null 입니다.
  { id: 'soy', emoji: '🍶', name: '간장', category: 'processed', defaultUnitLabels: null, avgShelfLifeDays: null, role: '짠맛과 콩 발효 특유의 감칠맛을 내는 가장 기초적인 양념이에요.', tip: '개봉 전에는 서늘한 실온에, 개봉 후에는 변질과 산화를 막기 위해 냉장고에 보관하세요.' },
  { id: 'salt', emoji: '🧂', name: '소금', category: 'processed', defaultUnitLabels: null, avgShelfLifeDays: null, role: '어떤 음식에든 짠맛을 더해 재료 본연의 맛을 한껏 살려주는 기본 조미료예요.', tip: '습기를 매우 잘 흡수하므로 반드시 뚜껑을 꼭 닫아 건조한 양념장에 보관하세요.' },
  { id: 'sugar', emoji: '🍬', name: '설탕', category: 'processed', defaultUnitLabels: null, avgShelfLifeDays: null, role: '기분 좋은 단맛을 내주고 고기의 연육 작용을 돕는 가루 조미료예요.', tip: '굳어버린 설탕은 식빵 조각을 잠시 넣어두면 다시 부드럽게 풀립니다.' },
  { id: 'sesameOil', emoji: '🍶', name: '참기름', category: 'processed', defaultUnitLabels: null, avgShelfLifeDays: null, role: '요리의 마지막에 둘러 특유의 고소한 향을 폭발시키는 향신 오일이에요.', tip: '산패되기 쉬우므로 공기와 햇빛을 철저히 피해 어두운 병에 담아 상온 보관하세요 (냉장보관 금지).' },
  { id: 'gochugaru', emoji: '🌶️', name: '고춧가루', category: 'processed', defaultUnitLabels: null, avgShelfLifeDays: null, role: '붉은 색감과 매콤칼칼한 한국식 알싸함을 주는 마른 고추 가루예요.', tip: '산소와 닿으면 색이 변하고 상하기 쉬우므로 꼭 지퍼백에 넣어 냉동실에 보관하세요.' },
  { id: 'gochujang', emoji: '🍯', name: '고추장', category: 'processed', defaultUnitLabels: null, avgShelfLifeDays: null, role: '묵직하고 매콤달콤한 소스로 떡볶이나 찌개 베이스로 깊은 맛을 냅니다.', tip: '양념이 묻은 숟가락을 그냥 넣으면 곰팡이가 피니, 늘 마른 숟가락으로 떠서 냉장 보관하세요.' },
  { id: 'doenjang', emoji: '🤎', name: '된장', category: 'processed', defaultUnitLabels: null, avgShelfLifeDays: null, role: '구수하고 짭조름하게 발효되어 된장찌개나 쌈장 베이스가 되는 한식의 영혼이에요.', tip: '단단히 밀폐해 냉장 보관하고 표면에 하얀 막이 생겨도 상한 게 아니니 걷어내고 쓰세요.' },
  { id: 'garlicMinced', emoji: '🧄', name: '다진마늘', category: 'processed', defaultUnitLabels: null, avgShelfLifeDays: null, role: '미리 갈아두어 양념장에 간편하게 감칠맛을 넣을 수 있는 조미 마늘이에요.', tip: '냉장실에서는 쉽게 누렇게 변하고 향이 날아가므로, 얼음틀에 넣어 큐브형으로 얼리세요.' },
  { id: 'oil', emoji: '🧴', name: '식용유', category: 'processed', defaultUnitLabels: null, avgShelfLifeDays: null, role: '전을 부치고 재료를 볶을 때 팬이 눌어붙지 않게 윤기를 주는 기름이에요.', tip: '열과 빛에 약하므로 가스레인지 주변 대신 그늘지고 서늘한 수납장에 두세요.' },
  { id: 'vinegar', emoji: '🍶', name: '식초', category: 'processed', defaultUnitLabels: null, avgShelfLifeDays: null, role: '새콤한 산미를 불어넣어 입맛을 돋우고 생선의 비린 맛을 날려버리는 아세트산 조미료예요.', tip: '산도가 강해 부식이 안 일어나는 유리병이나 플라스틱 용기에 단단히 닫아 보관하세요.' },
  { id: 'pepperPowder', emoji: '🧂', name: '후춧가루', category: 'processed', defaultUnitLabels: null, avgShelfLifeDays: null, role: '톡 쏘는 매콤향긋함으로 고기와 잡내를 잡아주는 향신료계의 기본 비서예요.', tip: '향이 날아가기 쉬우므로 밀폐 용기에 건조하게 담아 어두운 양념장에 상온 보관하세요.' },
  { id: 'cookingWine', emoji: '🍶', name: '맛술', category: 'processed', defaultUnitLabels: null, avgShelfLifeDays: null, role: '은은한 단맛과 알코올로 육류·생선의 누린 맛을 싹 없애주는 조리용 맛술이에요.', tip: '개봉 후에는 서늘한 실온 또는 냉장실에 넣어 마개를 꼭 닫아두세요.' },
  { id: 'oysterSauce', emoji: '🍶', name: '굴소스', category: 'processed', defaultUnitLabels: null, avgShelfLifeDays: null, role: '중식풍 볶음이나 감칠맛 조림 요리에 한 큰술로 맛을 보장하는 사기템 소스예요.', tip: '방부제가 없으므로 개봉 즉시 뚜껑 주위를 닦아 반드시 냉장 보관해야 변질을 막습니다.' },
  { id: 'plumSyrup', emoji: '🍯', name: '매실청', category: 'processed', defaultUnitLabels: null, avgShelfLifeDays: null, role: '새콤달달한 천연 감미료로 소화를 돕고 설탕 대신 고급진 단맛을 낼 때 씁니다.', tip: '밀폐해 서늘한 곳에 두면 오래 보관되나 가스가 생길 수 있으니 가끔 뚜껑을 여닫으세요.' },
  { id: 'cornSyrup', emoji: '🍯', name: '물엿', category: 'processed', defaultUnitLabels: null, avgShelfLifeDays: null, role: '끈적하고 투명해 요리에 먹음직스러운 윤기와 찐득한 단맛을 줄 때 씁니다.', tip: '겨울철에는 단단하게 굳을 수 있으므로 너무 차지 않은 따뜻한 상온에 보관하십시오.' },
  { id: 'honey', emoji: '🍯', name: '꿀', category: 'processed', defaultUnitLabels: null, avgShelfLifeDays: null, role: '건강하고 자연스러운 달콤함과 특유의 향긋함으로 요리를 빛내줍니다.', tip: '냉장고에 넣으면 결정이 생겨 굳어버리니 반드시 건조한 상온에 보관해야 합니다.' },
  { id: 'mayonnaise', emoji: '🧴', name: '마요네즈', category: 'processed', defaultUnitLabels: null, avgShelfLifeDays: null, role: '고소하고 녹진한 풍미로 샐러드 드레싱이나 매콤 요리 찍먹 소스가 됩니다.', tip: '너무 차가우면 기름과 계란이 분리되므로 냉장실 문쪽이나 서늘한 상온에 두세요.' },
  { id: 'ketchup', emoji: '🧴', name: '케첩', category: 'processed', defaultUnitLabels: null, avgShelfLifeDays: null, role: '토마토의 상큼달콤함으로 볶음밥이나 각종 계란 요리에 뿌려먹는 국민 소스예요.', tip: '튜브 입구에 소스가 묻어 있으면 마르고 상하니 닦아내고 냉장 보관하세요.' },
  { id: 'ssamjang', emoji: '💚', name: '쌈장', category: 'processed', defaultUnitLabels: null, avgShelfLifeDays: null, role: '된장과 고추장이 만나 고기 구울 때 찍어 먹는 고소짭조름한 쌈 조미료예요.', tip: '단단히 닫아 냉장고에 보관하고, 덜어 먹을 때는 침이나 물기가 없는 도구를 쓰세요.' },
  { id: 'mustard', emoji: '🧴', name: '머스타드', category: 'processed', defaultUnitLabels: null, avgShelfLifeDays: null, role: '톡 쏘는 겨자 향과 달큰함으로 훈제오리나 치킨너겟 소스로 빛을 발합니다.', tip: '마르지 않게 뚜껑을 돌려 닫고 비닐이나 지퍼백에 가볍게 담아 냉장 보관하세요.' },

  // ── 7. 가공식품/캔/기타 (Processed Foods - 가공식품) ──────────────────────────
  { id: 'spam', emoji: '🥫', name: '스팸 통조림', category: 'processed', defaultUnitLabels: null, avgShelfLifeDays: null, role: '짭조름하고 기름진 햄으로 부대찌개나 계란 구이에 잘 어울리는 가공육이에요.', tip: '캔 개봉 후 남은 햄은 통조림 채로 두면 상하니 밀폐 용기에 옮겨 담아 냉장하십시오.' },
  { id: 'tunaCan', emoji: '🥫', name: '참치캔', category: 'processed', defaultUnitLabels: null, avgShelfLifeDays: null, role: '기름에 담겨 고소하고 담백해 참치김치찌개나 샐러드, 마요 김밥에 제격이에요.', tip: '개봉하지 않은 캔은 그늘진 상온에 몇 년 보관 가능하고, 열면 이틀 내로 소진하세요.' },
  { id: 'sausage', emoji: '🌭', name: '비엔나 소시지', category: 'processed', defaultUnitLabels: null, avgShelfLifeDays: null, role: '문어로 칼집을 내 볶아 먹으면 귀여운 반찬이 되고 부대찌개에도 잘 들어갑니다.', tip: '포장을 뜯은 뒤에는 공기를 차단해 밀폐 보관하고 표면이 끈적해지면 드시지 마세요.' },
  { id: 'dumpling', emoji: '🥟', name: '냉동 만두', category: 'processed', defaultUnitLabels: null, avgShelfLifeDays: null, role: '쪄 먹거나 구워 먹고, 떡만둣국으로 끓이면 훌륭한 한 끼가 완성되는 비상 식품이에요.', tip: '냉동실 문 쪽은 온도가 자주 바뀌어 만두가 마르므로 안쪽에 단단히 묶어 넣어두세요.' },
  { id: 'pancakeMix', emoji: '🌾', name: '부침가루', category: 'processed', defaultUnitLabels: null, avgShelfLifeDays: null, role: '바삭하고 짭조름하게 밑간이 되어 전을 튀기듯 바삭하게 구워주는 가루예요.', tip: '개봉 후 실온에 두면 벌레나 습기가 차기 쉬우므로 단단히 밀봉해 냉동 보관하는 게 좋습니다.' },
  { id: 'curryPowder', emoji: '🍛', name: '카레가루', category: 'processed', defaultUnitLabels: null, avgShelfLifeDays: null, role: '여러 향신료가 조화롭게 섞여 밥 위에 슥슥 비벼 먹는 노란색 마법의 향신료 가루예요.', tip: '습기를 잘 흡수해 뭉치므로 밀폐 용기에 넣어 어둡고 건조한 실온 수납장에 두세요.' },
  { id: 'seaweed', emoji: '🍙', name: '조미 김', category: 'processed', defaultUnitLabels: null, avgShelfLifeDays: null, role: '고소한 들기름과 소금으로 구워 밥을 감싸 바삭하게 먹는 최고의 간편 밥도둑이에요.', tip: '밀폐용기 바닥에 키친타월이나 제습제를 같이 넣어두면 눅눅해지는 것을 막아줘요.' },
  { id: 'driedLaver', emoji: '🍙', name: '건반찬 김', category: 'processed', defaultUnitLabels: null, avgShelfLifeDays: null, role: '김국을 끓이거나 양념장을 발라 바삭한 구이로 해 먹는 자연 그대로의 마른김이에요.', tip: '공기에 닿으면 붉게 변색하고 눅눅해지니 신문지에 싸서 비닐 팩에 담아 냉동 보관하세요.' },
  { id: 'crabStick', emoji: '🦀', name: '맛살', category: 'processed', defaultUnitLabels: null, avgShelfLifeDays: null, role: '김밥, 산적 전, 샐러드 무침에 들어가 달큰한 게맛과 쫄깃 찢어지는 맛을 줍니다.', tip: '비닐 포장이 감싸진 채 냉장고 야채칸에 두고 개봉 후에는 빨리 요리하세요.' },
  { id: 'fishCake', emoji: '🍢', name: '어묵', category: 'processed', defaultUnitLabels: null, avgShelfLifeDays: null, role: '볶으면 부드럽고 쫄깃한 반찬이 되고, 전골로 끓이면 국물 맛을 우려내는 대표 반찬이에요.', tip: '냉장실 보관은 3~4일이 한계이므로 남은 조각은 랩으로 감싸 지퍼백에 밀폐 보관하세요.' },
  { id: 'cheeseStick', emoji: '🧀', name: '치즈스틱', category: 'processed', defaultUnitLabels: null, avgShelfLifeDays: null, role: '에어프라이어에 튀기면 쫀득한 치즈가 흘러나와 간식이나 맥주 안주로 그만이에요.', tip: '해동하지 않고 바로 냉동 상태에서 튀겨야 치즈가 옆구리로 터져 나오는 것을 막아요.' },
  { id: 'udong', emoji: '🍜', name: '우동 사리', category: 'processed', defaultUnitLabels: null, avgShelfLifeDays: null, role: '두툼하고 쫄깃하여 전골 사리로 넣거나 볶음우동으로 먹으면 포만감을 주는 면이에요.', tip: '상온 보관용으로 나온 주정 처리 사리는 실온 그늘에 두어도 문제가 없습니다.' },
  { id: 'pastaNoodle', emoji: '🍝', name: '스파게티 면', category: 'processed', defaultUnitLabels: null, avgShelfLifeDays: null, role: '토마토, 크림, 오일 소스를 부어 서양식 일품 면 요리를 만들 때 쓰이는 건면이에요.', tip: '건조한 병이나 파스타 전용 밀폐 롱케이스에 담아 서늘한 수납장에 보관하세요.' },
  { id: 'porkCutlet', emoji: '🥩', name: '냉동 돈까스', category: 'processed', defaultUnitLabels: null, avgShelfLifeDays: null, role: '기름에 튀기면 겉바속촉 든든하게 고기 반찬을 완성하는 냉동 일품육이에요.', tip: '수분이 성에로 맺히면 기름이 많이 튀므로 밀봉 지퍼백에 꽉 밀폐해 보관하세요.' },
  { id: 'spicyPork', emoji: '🥩', name: '제육 밀키트', category: 'processed', defaultUnitLabels: null, avgShelfLifeDays: null, role: '고기와 야채가 매콤 소스에 재워져 팬에 볶기만 하면 밥반찬이 되는 든든한 밀키트예요.', tip: '양념육이라 냉장 보관은 오래가지 않으므로 유통기한 내에 빠르게 소비하세요.' },
  { id: 'tokkboki', emoji: '🍡', name: '떡볶이 밀키트', category: 'processed', defaultUnitLabels: null, avgShelfLifeDays: null, role: '떡과 어묵, 소스가 세트로 포장되어 물만 넣고 끓이면 완성되는 간식 밀키트예요.', tip: '포장 팩 내부에 손상이 생기지 않도록 너무 무거운 물건 아래에 짓눌려 두지 마세요.' },
  { id: 'soupPack', emoji: '🍲', name: '사골 육수 팩', category: 'processed', defaultUnitLabels: null, avgShelfLifeDays: null, role: '부대찌개나 떡국 끓일 때 맹물 대신 부으면 국물이 뽀얗고 묵직해지는 마법 육수예요.', tip: '멸균 레토르트 파우치 포장이라 상온의 건조한 창고나 수납장에서 보관하면 안전합니다.' },
  { id: 'chickenNugget', emoji: '🍗', name: '치킨 너겟', category: 'processed', defaultUnitLabels: null, avgShelfLifeDays: null, role: '바삭하고 고소해 아이들 밥반찬이나 야식 안주로 에어프라이어에 뚝딱 구워 먹어요.', tip: '지퍼락을 확실히 닫아 냉동실 성에 냄새가 너겟에 배지 않도록 예방하세요.' },
  { id: 'bread', emoji: '🍞', name: '식빵', category: 'processed', defaultUnitLabels: null, avgShelfLifeDays: null, role: '토스트를 하거나 잼을 발라 먹고 샌드위치를 만드는 폭신하고 부드러운 빵이에요.', tip: '상온에서는 이틀 내에 드시고, 남은 빵은 소분 밀봉하여 냉동했다가 구워 드세요.' }
];

export const ingredients = INGREDIENT_LIST;
export const ingredientMap = Object.fromEntries(
  INGREDIENT_LIST.map((ing) => [ing.id, ing]),
);

export function getSeason(purchasedAt) {
  const month = new Date(purchasedAt).getMonth() + 1;
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'fall';
  return 'winter';
}

export function calcExpiryDate(ingredientId, purchasedAt) {
  const master = ingredientMap[ingredientId];
  if (!master?.avgShelfLifeDays) return null;
  const days = master.avgShelfLifeDays[getSeason(purchasedAt)];
  const expiry = new Date(purchasedAt);
  expiry.setDate(expiry.getDate() + days);
  return expiry.toISOString().slice(0, 10);
}
