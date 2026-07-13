// ============================================================
// agents/spec.js — "직원에게 주는 작업 지시서"
//   도메인만 바꾸면 화장실/곰팡이/벌레로 그대로 재사용
// ============================================================

export const DOMAINS = {
  kitchen_odor: {
    domain: "kitchen_odor",
    title: "자취방 부엌 악취",
    // ★ 허용 원인 enum. 추출자가 이 id만 쓰도록 강제한다.
    //   (id가 문서마다 흩어지면 집계가 통째로 무너짐 — 가장 치명적인 실패 모드)
    //   첫 크롤의 unlisted 리포트를 보고 유의미한 원인이 나오면 여기에 추가할 것.
    causes: [
      { id: "drain_organic",    label: "배수구 유기물 부패" },
      { id: "trap_dry",         label: "배수 트랩 마름/부재" },
      { id: "food_waste",       label: "음식물 쓰레기통" },
      { id: "mold_under_sink",  label: "싱크대 하부 곰팡이" },
      { id: "fridge_spoiled",   label: "냉장고 내부 부패" },
      { id: "sponge_dishcloth", label: "수세미/행주 세균" },
    ],
    // 스카우트가 돌릴 검색어. 한국 특수성 확보가 목적.
    queries: [
      "싱크대 배수구 냄새 원인 해결",
      "자취방 부엌 악취 원인",
      "원룸 하수구 냄새 올라옴 트랩",
      "싱크대 하수구 냄새 제거 방법",
      "음식물 쓰레기 냄새 원룸",
      "싱크대 아래 곰팡이 냄새",
      "배수 트랩 봉수 마름 냄새",
      "kitchen sink smell rotten egg cause",
    ],
    // 카드 추출 시 이 축들을 뽑는다 = 나중에 observable이 됨
    axes: {
      smell_type: ["rotten_egg", "sour_musty", "sweet_rotten", "chemical", "unspecified"],
      location_hot: ["sink_drain", "under_sink", "trash", "fridge", "whole_room", "unspecified"],
      onset: ["sudden", "gradual", "unspecified"],
      water_gap: ["yes", "no", "unspecified"],
    },
    axisQuestions: {
      smell_type:   { q: "어떤 냄새에 가까운가요?", cost: 1.0,
                      labels: { rotten_egg:"썩은 계란/하수구", sour_musty:"시큼하고 꿉꿉한", sweet_rotten:"달착지근하게 상한", chemical:"화학약품 같은", unspecified:"잘 모르겠어요" } },
      location_hot: { q: "어디에 가까이 가면 심해지나요?", cost: 1.0,
                      labels: { sink_drain:"싱크대 배수구", under_sink:"싱크대 아래 문 열면", trash:"쓰레기통 쪽", fridge:"냉장고 열면", whole_room:"집 전체", unspecified:"잘 모르겠어요" } },
      onset:        { q: "언제부터 그랬나요?", cost: 1.0,
                      labels: { sudden:"갑자기 (며칠 새)", gradual:"서서히 (몇 주)", unspecified:"모르겠어요" } },
      water_gap:    { q: "3일 이상 물을 안 쓴 적 있나요?", cost: 1.0,
                      note: "★ 한국 원룸 트랩 판별 — LLM이 스스로 물을 리 없는 질문",
                      labels: { yes:"네 (여행/출장 등)", no:"아뇨, 매일 써요", unspecified:"기억 안 나요" } },
    },
    minCards: 20,      // 이 미만이면 통계가 안 됨 → 스카우트 재실행
    maxHypotheses: 7,  // 8개 넘으면 관리 불가
  },

  bathroom_mold: {
    domain: "bathroom_mold",
    title: "자취방 화장실 곰팡이·악취",
    causes: [
      { id: "silicone_mold",   label: "실리콘 이음새 곰팡이" },
      { id: "grout_mold",      label: "타일 줄눈 곰팡이" },
      { id: "ceiling_conden",  label: "천장 결로 곰팡이" },
      { id: "drain_sewer",     label: "배수구 하수 역류 냄새" },
      { id: "trap_dry",        label: "배수 트랩 마름/부재" },
      { id: "poor_vent",       label: "환기 불량 (습도 정체)" },
      { id: "towel_damp",      label: "젖은 수건·매트 방치" },
    ],
    queries: [
      "원룸 화장실 곰팡이 원인 제거",
      "욕실 실리콘 곰팡이 검은색",
      "화장실 하수구 냄새 올라옴",
      "욕실 환풍기 곰팡이 습도",
      "화장실 천장 곰팡이 결로",
      "자취방 욕실 습기 제거",
    ],
    axes: {
      mold_where: ["silicone_joint", "ceiling", "grout", "drain", "wall", "unspecified"],
      smell_type: ["sewer", "musty", "none", "unspecified"],
      ventilation: ["no_window_no_fan", "fan_only", "window", "unspecified"],
      onset: ["sudden", "gradual", "unspecified"],
    },
    axisQuestions: {
      mold_where:  { q: "곰팡이가 주로 어디에 있나요?", cost: 1.0,
                     labels: { silicone_joint:"실리콘 이음새", ceiling:"천장", grout:"타일 줄눈", drain:"배수구 주변", wall:"벽면", unspecified:"여기저기" } },
      smell_type:  { q: "냄새는 어떤가요?", cost: 1.0,
                     labels: { sewer:"하수구 냄새", musty:"꿉꿉한 곰팡이 냄새", none:"냄새는 없어요", unspecified:"모르겠어요" } },
      ventilation: { q: "환기는 어떻게 하고 있나요?", cost: 1.0,
                     labels: { no_window_no_fan:"창문·환풍기 없음", fan_only:"환풍기만", window:"창문 있음", unspecified:"모르겠어요" } },
      onset:       { q: "언제부터 그랬나요?", cost: 1.0,
                     labels: { sudden:"갑자기", gradual:"서서히", unspecified:"모르겠어요" } },
    },
    minCards: 20,
    maxHypotheses: 7,
  },
};

// 우도는 5단계로만. 0.73 같은 숫자 고민 금지.
export const L5 = { certain: 0.90, likely: 0.70, neutral: 0.50, unlikely: 0.25, rare: 0.05 };
export const snap5 = (x) => {
  const vals = [0.05, 0.25, 0.50, 0.70, 0.90];
  return vals.reduce((b, v) => (Math.abs(v - x) < Math.abs(b - x) ? v : b), 0.5);
};
