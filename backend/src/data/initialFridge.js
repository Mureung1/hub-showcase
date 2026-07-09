// 초기 냉장고 재고 시드 데이터 — index.html 프로토타입의 `fridge` 객체를 그대로 옮김.
// levels 배열의 마지막 항목은 항상 '소진'이며, level 인덱스가 levels.length-1이면 재고 없음.
export const initialFridge = {
  pork: {
    emoji: '🥩', name: '돼지고기 앞다리', category: 'fresh',
    levels: ['300g', '150g', '소진'], level: 0, purchased: '7/3', expiry: 'D-2', imminent: true,
    role: '단백질이 필요한 볶음·구이·찌개에 두루 쓰는 기본 고기예요.',
    tip: '한 번 먹을 만큼 소분해서 냉동하면 오래가요. 해동은 냉장실에서 천천히 하는 게 맛이 덜 빠져요.',
  },
  tofu: {
    emoji: '🧊', name: '두부', category: 'fresh',
    levels: ['반모', '소진'], level: 0, purchased: '7/5', expiry: 'D-1', imminent: true,
    role: '단백질을 더하면서 부드러운 식감을 주는 재료예요. 찌개·조림·부침 어디든 잘 어울려요.',
    tip: '개봉 후엔 물에 담가 냉장 보관하고, 매일 물을 갈아주면 2~3일 더 신선하게 먹을 수 있어요.',
  },
  onion: {
    emoji: '🧅', name: '양파', category: 'fresh',
    levels: ['반쪽', '1/4쪽', '소진'], level: 0, purchased: '7/3', expiry: 'D-9', imminent: false,
    role: '볶으면 단맛을 내는 국물·볶음 요리의 기본 재료예요. 한식 대부분에 들어가요.',
    tip: '자른 양파는 랩으로 감싸 냉장 보관하고 일주일 안에 드세요. 통양파는 서늘하고 통풍되는 곳에 두면 한 달 이상 가요.',
  },
  pa: {
    emoji: '🥬', name: '대파', category: 'fresh',
    levels: ['한단', '3/4단', '1/2단', '1/4단', '소진'], level: 0, purchased: '7/3', expiry: 'D-6', imminent: false,
    role: '향을 살리는 향신 재료예요. 국물 요리의 마무리나 고기 잡내 제거에 자주 써요.',
    tip: '씻어서 물기를 없앤 뒤 키친타월에 말아 냉장 보관하면 1~2주 가요. 잘라서 냉동하면 더 오래 써요.',
  },
  kimchi: {
    emoji: '🌶️', name: '김치', category: 'fresh',
    levels: ['1/2통', '1/3통', '1/4통', '소진'], level: 0, purchased: '7/1', expiry: 'D-40', imminent: false,
    role: '그 자체로 반찬이 되면서 찌개·볶음밥에 감칠맛과 칼칼함을 더해줘요.',
    tip: '꾹꾹 눌러 공기를 빼고 밀폐하면 발효가 천천히 진행돼요. 익을수록 찌개·볶음 요리에 더 잘 어울려요.',
  },
  egg: {
    emoji: '🥚', name: '계란', category: 'fresh',
    levels: ['6알', '5알', '4알', '3알', '2알', '1알', '소진'], level: 0, purchased: '7/1', expiry: 'D-18', imminent: false,
    role: '거의 모든 요리에 두루 쓰는 만능 단백질 재료예요.',
    tip: '뾰족한 쪽이 아래로 가게 세워서 냉장 보관하면 신선도가 더 오래 유지돼요.',
  },
  soy: {
    emoji: '🍶', name: '간장', category: 'processed', qtyLabel: '1병', expiryLabel: null,
    role: '짠맛과 감칠맛을 내는 기본 양념이에요. 거의 모든 볶음·조림에 들어가요.',
    tip: '직사광선을 피해 서늘한 곳에 두면 상온 보관도 가능해요. 개봉 후엔 냉장 보관을 추천해요.',
  },
  ramen: {
    emoji: '🍜', name: '라면', category: 'processed', qtyLabel: '2개', expiryLabel: 'D-90',
    role: '급할 때 빠르게 한 끼를 해결해주는 비상용 식재료예요.',
    tip: '습기를 피해 서늘하고 건조한 곳에 두면 표시된 유통기한까지 문제없어요.',
  },
};
