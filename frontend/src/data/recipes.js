// 레시피 데이터 — index.html 프로토타입의 `recipes` 객체를 그대로 옮김.
export const recipeOrder = [
  'tofu-braise', 'tofu-pan', 'kimchi-jjigae', 'jeyuk-bokkeum',
  'egg-steam', 'egg-roll', 'kimchi-fried-rice', 'pajeon', 'omelette',
  'kimchi-pork-jjim',
];

export const recipes = {
  'tofu-braise': {
    name: '두부조림', emoji: '🍳', level: 'beginner', levelLabel: '🟢 초보자', time: 15,
    category: '밑반찬',
    note: '임박 재료 두부를 소진할 수 있어요',
    ingredients: [
      { id: 'tofu', amt: '반모' },
      { id: 'pa', amt: '1/4단' },
      { id: 'onion', amt: '1/4쪽' },
      { id: 'soy', amt: '3큰술', untracked: true },
    ],
    addons: [
      { id: 'egg', label: '계란 1알', desc: '계란옷을 입히면 더 고소하고 부드러워요', after: 0,
        step: { emoji: '🥚', text: '썬 두부에 계란물을<br>골고루 입혀 주세요', tip: '💡 계란옷이 양념을 머금어 더 부드러워요', sum: '썬 두부에 계란물을 입힌다', tips: ['eggwash'] } },
      { id: 'pork', label: '돼지고기 조금', desc: '함께 구우면 든든한 두부고기조림 · 임박 재료 소진!', after: 1,
        step: { emoji: '🥩', text: '팬 한쪽에 돼지고기를 넣고<br>두부와 함께 구워요', tip: '💡 임박한 돼지고기를 소진할 수 있어요', sum: '돼지고기를 두부와 함께 굽는다', tips: ['pork', 'oil'] } },
      { id: 'kimchi', label: '김치 1/4컵', desc: '칼칼한 김치두부조림으로 변신해요', after: 2,
        step: { emoji: '🌶️', text: '양념 위에 김치를 얹고<br>같이 조려 주세요', tip: '💡 칼칼한 김치두부조림이 돼요', sum: '김치를 얹어 함께 조린다', tips: ['heat'] } },
    ],
    steps: [
      { emoji: '🔪', text: '두부를 1.5cm 두께로<br>도톰하게 썰어 주세요', tip: '💡 키친타월로 물기를 닦으면 팬에서 안 튀어요', sum: '두부를 1.5cm 두께로 썬다', tips: ['knife'] },
      { emoji: '🍳', text: '기름 두른 팬에 두부를<br>앞뒤로 노릇하게 구워요', tip: '💡 중불에서 앞뒤 3분씩이면 충분해요', sum: '팬에 두부를 노릇하게 굽는다', tips: ['oil', 'heat'] },
      { emoji: '🥣', text: '간장 3큰술 + 물 반컵 양념을<br>붓고 약불로 조려요', tip: '💡 국물이 자작해질 때까지 5분!', sum: '간장 양념을 붓고 조린다', tips: ['season', 'heat'] },
      { emoji: '🥬', text: '썰어둔 파를 올리고<br>1분 더 조리면 완성!', tip: '💡 참깨를 뿌리면 더 맛있어요', sum: '파를 올려 마무리한다', tips: ['knife'] },
    ],
  },
  'tofu-pan': {
    name: '두부부침', emoji: '🍢', level: 'beginner', levelLabel: '🟢 초보자', time: 8,
    category: '밑반찬',
    note: '재료 3개면 끝나는 초간단 요리예요',
    ingredients: [
      { id: 'tofu', amt: '반모' },
      { name: '소금', amt: '약간', untracked: true },
      { name: '식용유', amt: '2큰술', untracked: true },
    ],
    addons: [],
    steps: [
      { emoji: '🔪', text: '두부를 도톰하게 썰고<br>소금을 살짝 뿌려 밑간해요', sum: '두부를 썰어 밑간한다', tips: ['knife'] },
      { emoji: '🍳', text: '기름 두른 팬에 앞뒤로<br>노릇하게 구워요', sum: '팬에 두부를 노릇하게 굽는다', tips: ['oil', 'heat'] },
      { emoji: '🍶', text: '그릇에 담고 간장을<br>곁들이면 완성!', sum: '간장을 곁들여 마무리한다', tips: [] },
    ],
  },
  'kimchi-jjigae': {
    name: '김치찌개', emoji: '🍲', level: 'beginner', levelLabel: '🟢 초보자', time: 20,
    category: '찌개',
    note: '임박 재료 두부·돼지고기를 함께 소진해요',
    ingredients: [
      { id: 'kimchi', amt: '1/2컵' },
      { id: 'pork', amt: '100g' },
      { id: 'tofu', amt: '반모' },
      { id: 'pa', amt: '1/4단' },
      { name: '고춧가루', amt: '1작은술' },
    ],
    addons: [],
    steps: [
      { emoji: '🔪', text: '두부와 대파를<br>큼직하게 썰어요', sum: '두부와 대파를 썬다', tips: ['knife'] },
      { emoji: '🍲', text: '냄비에 물과 김치,<br>돼지고기를 넣고 끓여요', sum: '물·김치·돼지고기를 끓인다', tips: ['heat'] },
      { emoji: '🧊', text: '두부를 넣고<br>한소끔 더 끓이면 완성!', sum: '두부를 넣어 마무리한다', tips: ['heat'] },
    ],
  },
  'jeyuk-bokkeum': {
    name: '제육볶음', emoji: '🥘', level: 'mid', levelLabel: '🟡 중급자', time: 25,
    category: '메인반찬',
    note: '임박 재료 돼지고기를 소진할 수 있어요',
    ingredients: [
      { id: 'pork', amt: '150g' },
      { id: 'onion', amt: '1/4쪽' },
      { id: 'pa', amt: '1/4단' },
      { id: 'soy', amt: '1큰술', untracked: true },
      { name: '다진마늘', amt: '1작은술', untracked: true },
      { name: '양배추', amt: '1/8통' },
    ],
    addons: [],
    steps: [
      { emoji: '🥣', text: '돼지고기에 양념을<br>버무려 재워요', sum: '고기에 양념을 버무린다', tips: ['season'] },
      { emoji: '🍳', text: '달군 팬에 기름을 두르고<br>고기를 먼저 볶아요', sum: '고기를 먼저 볶는다', tips: ['oil', 'heat'] },
      { emoji: '🧅', text: '양파·대파를 넣고<br>센 불에서 빠르게 볶아요', sum: '채소를 넣어 마무리한다', tips: ['heat'] },
    ],
  },
  'egg-steam': {
    name: '계란찜', emoji: '🥣', level: 'beginner', levelLabel: '🟢 초보자', time: 12,
    category: '밑반찬',
    note: '재료 3개면 끝나는 초간단 요리예요',
    ingredients: [
      { id: 'egg', amt: '2알' },
      { name: '물', amt: '1/2컵', untracked: true },
      { name: '소금', amt: '약간', untracked: true },
    ],
    addons: [],
    steps: [
      { emoji: '🥚', text: '계란을 풀고 물과<br>소금 약간을 섞어요', sum: '계란물을 만든다', tips: [] },
      { emoji: '🍲', text: '뚝배기에 붓고<br>중약불로 저어가며 익혀요', sum: '저어가며 익힌다', tips: ['heat'] },
      { emoji: '🥣', text: '몽글몽글 익으면 뚜껑 덮고<br>1분 뜸 들이면 완성!', sum: '뚜껑 덮고 뜸을 들인다', tips: [] },
    ],
  },
  'egg-roll': {
    name: '계란말이', emoji: '🍥', level: 'beginner', levelLabel: '🟢 초보자', time: 10,
    category: '밑반찬',
    note: '재료 3개면 끝나는 초간단 요리예요',
    ingredients: [
      { id: 'egg', amt: '3알' },
      { id: 'pa', amt: '1/8단' },
      { id: 'soy', amt: '1작은술', untracked: true },
    ],
    addons: [],
    steps: [
      { emoji: '🔪', text: '계란을 풀고 잘게 썬<br>파를 섞어요', sum: '계란물에 파를 섞는다', tips: ['knife'] },
      { emoji: '🍳', text: '약불로 달군 팬에<br>얇게 부어 익혀요', sum: '팬에 얇게 부어 익힌다', tips: ['heat'] },
      { emoji: '🍥', text: '반쯤 익으면 돌돌 말아<br>마저 익히면 완성!', sum: '돌돌 말아 마무리한다', tips: [] },
    ],
  },
  'kimchi-fried-rice': {
    name: '김치볶음밥', emoji: '🍚', level: 'beginner', levelLabel: '🟢 초보자', time: 10,
    category: '밥/죽/떡',
    note: '냉장고 재료로 빠르게 한 끼 해결',
    ingredients: [
      { id: 'kimchi', amt: '1/2컵' },
      { name: '밥', amt: '1공기', untracked: true },
      { id: 'pa', amt: '1/8단' },
      { name: '참기름', amt: '1작은술' },
    ],
    addons: [
      { id: 'egg', label: '계란후라이 1개', desc: '볶음밥 위에 올리면 더 든든해요', after: 2,
        step: { emoji: '🍳', text: '계란후라이를 하나 부쳐<br>볶음밥 위에 올려요', tip: '💡 노른자를 톡 터뜨려 비비면 더 고소해요', sum: '계란후라이를 올린다', tips: ['oil'] } },
    ],
    steps: [
      { emoji: '🍳', text: '팬에 기름을 두르고<br>김치를 볶아요', sum: '김치를 볶는다', tips: ['oil'] },
      { emoji: '🍚', text: '밥을 넣고<br>고루 볶아요', sum: '밥을 넣어 볶는다', tips: ['heat'] },
      { emoji: '🥬', text: '파를 뿌려<br>마무리해요', sum: '파를 뿌려 마무리한다', tips: [] },
    ],
  },
  pajeon: {
    name: '파전', emoji: '🥞', level: 'mid', levelLabel: '🟡 중급자', time: 20,
    category: '메인반찬',
    note: '비 오는 날 어울리는 메뉴예요',
    ingredients: [
      { id: 'pa', amt: '1/2단' },
      { name: '부침가루', amt: '1컵', untracked: true },
      { id: 'egg', amt: '1알' },
      { name: '해물', amt: '약간' },
    ],
    addons: [],
    steps: [
      { emoji: '🔪', text: '부침가루 반죽에<br>대파와 계란을 섞어요', sum: '반죽에 재료를 섞는다', tips: ['knife'] },
      { emoji: '🍳', text: '기름을 넉넉히 두른 팬에<br>얇게 펴 부쳐요', sum: '팬에 얇게 펴 부친다', tips: ['oil', 'heat'] },
      { emoji: '🥞', text: '앞뒤로 노릇하게<br>뒤집어 구우면 완성!', sum: '뒤집어 마무리한다', tips: ['heat'] },
    ],
  },
  omelette: {
    name: '오믈렛', emoji: '🧀', level: 'mid', levelLabel: '🟡 중급자', time: 15,
    category: '메인반찬',
    note: '아침 식사로 좋아요',
    ingredients: [
      { id: 'egg', amt: '2알' },
      { name: '우유', amt: '2큰술', untracked: true },
      { id: 'onion', amt: '1/8쪽' },
      { name: '치즈', amt: '1장' },
    ],
    addons: [],
    steps: [
      { emoji: '🥚', text: '계란을 풀고<br>우유를 살짝 섞어요', sum: '계란물을 만든다', tips: [] },
      { emoji: '🍳', text: '약불로 달군 팬에 부어<br>반숙으로 익혀요', sum: '반숙으로 익힌다', tips: ['heat'] },
      { emoji: '🧅', text: '양파를 올리고<br>반으로 접으면 완성!', sum: '접어서 마무리한다', tips: ['knife'] },
    ],
  },
  'kimchi-pork-jjim': {
    name: '돼지고기 김치찜', emoji: '🍖', level: 'expert', levelLabel: '🔴 상급자', time: 40,
    category: '찌개',
    note: '초벌 볶음 후 오래 끓여 완성하는 난이도 있는 요리예요',
    ingredients: [
      { id: 'pork', amt: '200g' },
      { id: 'kimchi', amt: '1/3통' },
      { id: 'onion', amt: '1/4쪽' },
      { id: 'pa', amt: '1/4단' },
      { id: 'soy', amt: '2큰술', untracked: true },
      { name: '설탕', amt: '1큰술', untracked: true },
    ],
    addons: [],
    steps: [
      { emoji: '🔪', text: '돼지고기와 김치를<br>큼직하게 썰어 준비해요', sum: '재료를 손질한다', tips: ['knife'] },
      { emoji: '🍳', text: '팬에 김치를 먼저 볶아<br>기름이 배게 해요', sum: '김치를 먼저 볶는다', tips: ['oil'] },
      { emoji: '🍲', text: '돼지고기와 양념을 넣고<br>물을 부어 약불로 30분 이상 끓여요', sum: '약불로 오래 끓인다', tips: ['heat', 'season'] },
      { emoji: '🥬', text: '대파를 올려<br>한소끔 더 끓이면 완성!', sum: '대파를 올려 마무리한다', tips: ['knife'] },
    ],
  },
};
