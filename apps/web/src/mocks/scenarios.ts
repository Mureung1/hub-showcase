import type { ScenarioKey, Scenario, ChannelMeta, HistoryItem } from "shared";

/**
 * 데모 폴백용 mock 데이터 (삭제하지 않는다 — MOCK_MODE 데모 보험).
 * 실연동 시엔 api/client 가 서버 데이터를 쓰고, 이 mock은 발표장 네트워크
 * 불신 대비 폴백으로만 남긴다.
 */

export const SCENARIOS: Record<ScenarioKey, Scenario> = {
  rain: {
    label: "비", emoji: "🌧️", temp: "18°C", cond: "비 · 습도 85% · 강수 6mm/h",
    sourceLabel: "기상청·OpenWeather 2개 소스 평균",
    diagText: "비 오는 날 평균 −18%", diagTone: "down",
    bars: [62, 70, 58, 66, 72, 45, 60], barToday: 5, todayDown: true,
    normalSales: 840000, predSales: 689000, target: 780000,
    impTone: "down", impHead: "이 가게 데이터 기준 −18% 예상",
    impDetail: "최근 비 온 6일 평균 매출이 맑은 날 대비 18% 낮았어요. 픽업 프로모션 발송 시 평균 −7%까지 방어됐습니다.",
    title: "비 오는 날 픽업 할인 캠페인",
    copy: "☔ 비 오는 오늘, 굳이 나오지 마세요! 🙅‍♀️\n따뜻한 아메리카노 ☕ 생각날 땐\n미리 주문하고 픽업하세요 🏃‍♂️💨\n오늘 픽업 주문 10% 할인 🎉✨",
    promo: "픽업 주문 10% 할인 (오늘 하루)",
    channels: ["instagram", "dangol"], coupon: { used: 37, revenue: 48100 },
  },
  sunny: {
    label: "맑음", emoji: "☀️", temp: "24°C", cond: "맑음 · 습도 40% · 바람 약함",
    sourceLabel: "기상청·OpenWeather 2개 소스 평균",
    diagText: "맑은 날 평균 +12%", diagTone: "up",
    bars: [62, 70, 58, 66, 72, 80, 60], barToday: 5, todayDown: false,
    normalSales: 840000, predSales: 940000, target: 940000,
    impTone: "up", impHead: "이 가게 데이터 기준 +12% 기대",
    impDetail: "최근 맑은 6일 평균 매출이 평상시 대비 12% 높았어요. 방어할 하락이 없는 날이라, 오르는 매출을 더 끌어올리는 쪽으로 제안했습니다.",
    title: "맑은 날 테이크아웃 픽업 캠페인",
    copy: "☀️ 날씨 좋은 오늘, 산책 한 잔 어때요?\n시원한 콜드브루 🥤 들고 가볍게 걸어보세요 🚶‍♀️\n오늘 테이크아웃 전 음료 15% 할인 🎉",
    promo: "테이크아웃 음료 15% 할인 (오늘)",
    channels: ["instagram", "x"], coupon: { used: 29, revenue: 39200 },
  },
  cold: {
    label: "한파", emoji: "❄️", temp: "-6°C", cond: "한파 · 체감 −12°C · 바람 강함",
    sourceLabel: "기상청·OpenWeather 2개 소스 평균",
    diagText: "한파 평균 −28%", diagTone: "down",
    bars: [62, 70, 58, 66, 72, 40, 55], barToday: 5, todayDown: true,
    normalSales: 840000, predSales: 605000, target: 720000,
    impTone: "down", impHead: "이 가게 데이터 기준 −28% 예상",
    impDetail: "최근 한파였던 6일 평균 매출이 평상시 대비 28% 낮았어요. 따뜻한 세트 쿠폰을 보낸 날은 평균 −14%까지 방어됐습니다.",
    title: "한파 대비 온기 세트 쿠폰",
    // 문구는 세 채널(인스타·X·단골 문자)에 같은 내용이 나간다 — 인스타·X는 불특정 다수가
    // 보는 공개 채널이라 "단골님께만"·"이 문자 보여주시면" 같은 문자 전용 말을 쓰면 안 된다.
    copy: "❄️ 오늘 진짜 춥죠? 몸 녹이러 오세요 🔥\n따뜻한 라떼 ☕ + 오늘의 스콘 🥐 세트를\n오늘 하루 특별한 가격에 준비했어요 💛\n세트 주문하시면 2,000원 할인 🎁",
    promo: "따뜻한 라떼+스콘 세트 2,000원 할인 (오늘)",
    channels: ["instagram", "dangol"], coupon: { used: 44, revenue: 61500 },
  },
  heat: {
    label: "폭염", emoji: "🥵", temp: "35°C", cond: "폭염 · 체감 38°C · 자외선 매우 높음",
    sourceLabel: "기상청·OpenWeather 2개 소스 평균",
    diagText: "폭염 평균 −6%", diagTone: "down",
    // 예전엔 오늘 막대가 초록·최고치(75)인데 진단은 하락이라 화면끼리 어긋났다.
    // predSales(790,000)가 평상시(840,000) 대비 −6%이므로 막대도 평균 아래로 맞춘다.
    bars: [62, 70, 58, 66, 72, 68, 63], barToday: 6, todayDown: true,
    normalSales: 840000, predSales: 790000, target: 832000,
    impTone: "down", impHead: "이 가게 데이터 기준 −6% 예상",
    // 시간대별 수치는 쓰지 않는다 — 우리가 받는 건 일 단위 매출뿐이라 "낮 −20%"를 뒷받침할
    // 데이터가 없다. 시간대 전략은 캠페인 설계(17시 이후)로만 남기고, 근거는 일매출로 말한다.
    impDetail: "최근 폭염이던 6일 평균 매출이 평상시 대비 6% 낮았어요. 오후 에이드 프로모션을 보낸 날은 평균 −1%까지 방어됐습니다.",
    title: "폭염 쿨다운 저녁 캠페인",
    copy: "🥵 이 더위, 얼음 동동 한 잔이 답입니다 🧊\n오후 5시부터 시그니처 에이드 🍹\n시원하게 준비했어요 ✨\n저녁 방문 시 에이드 20% 할인 🎉",
    promo: "17시 이후 에이드 20% 할인 (오늘)",
    channels: ["instagram", "x", "dangol"], coupon: { used: 33, revenue: 44800 },
  },
};

export const CHANNELS: ChannelMeta[] = [
  { id: "instagram", icon: "📷", label: "인스타그램", desc: "본인 계정 자동 게시", legal: false },
  { id: "x", icon: "𝕏", label: "X (트위터)", desc: "문구 복사 후 게시", legal: false },
  { id: "dangol", icon: "💬", label: "단골 메시지", desc: "쿠폰 포함 · 광고성 정보", legal: true },
];

export const HISTORY: HistoryItem[] = [
  { emoji: "🌧️", title: "비 오는 날 픽업 할인", date: "어제", used: 37, total: 142, revenue: 48100 },
  { emoji: "❄️", title: "한파 온기 세트 쿠폰", date: "3일 전", used: 44, total: 142, revenue: 61500 },
  { emoji: "☀️", title: "맑은 날 테이크아웃", date: "5일 전", used: 29, total: 142, revenue: 39200 },
  { emoji: "🌧️", title: "장마 배달 프로모션", date: "1주 전", used: 41, total: 142, revenue: 53400 },
];
