import type { ScenarioKey, Scenario, ChannelMeta, HistoryItem } from "shared";

/**
 * 데모 폴백용 mock 데이터 (삭제하지 않는다 — MOCK_MODE 데모 보험).
 * 실연동 시엔 api/client 가 서버 데이터를 쓰고, 이 mock은 발표장 네트워크
 * 불신 대비 폴백으로만 남긴다.
 */

export const SCENARIOS: Record<ScenarioKey, Scenario> = {
  rain: {
    label: "비", emoji: "🌧️", temp: "18°C", cond: "비 · 습도 85% · 강수 6mm/h",
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
    diagText: "맑은 날 평균 +12%", diagTone: "up",
    bars: [62, 70, 58, 66, 72, 80, 60], barToday: 5, todayDown: false,
    normalSales: 840000, predSales: 940000, target: 940000,
    impTone: "up", impHead: "이 가게 데이터 기준 +12% 기대",
    impDetail: "맑은 날은 테이크아웃 비중이 평균 22% 올라가요. 야외석·산책 수요를 겨냥한 게시물이 유입에 효과적이었습니다.",
    title: "맑은 날 테이크아웃 픽업 캠페인",
    copy: "☀️ 날씨 좋은 오늘, 산책 한 잔 어때요?\n시원한 콜드브루 🥤 들고 가볍게 걸어보세요 🚶‍♀️\n오늘 테이크아웃 전 음료 15% 할인 🎉",
    promo: "테이크아웃 음료 15% 할인 (오늘)",
    channels: ["instagram", "x"], coupon: { used: 29, revenue: 39200 },
  },
  cold: {
    label: "한파", emoji: "❄️", temp: "-6°C", cond: "한파 · 체감 −12°C · 바람 강함",
    diagText: "한파 방문 −28%", diagTone: "down",
    bars: [62, 70, 58, 66, 72, 40, 55], barToday: 5, todayDown: true,
    normalSales: 840000, predSales: 605000, target: 720000,
    impTone: "down", impHead: "방문 −28% · 객단가는 +9%",
    impDetail: "추운 날은 손님 수가 크게 줄지만 온 손님의 객단가는 오릅니다. 단골 대상 세트 쿠폰이 방문 회복에 가장 효과적이었어요.",
    title: "한파 대비 단골 온기 쿠폰",
    copy: "❄️ 오늘 진짜 춥죠? 몸 녹이러 오세요 🔥\n따뜻한 라떼 ☕ + 오늘의 스콘 🥐 세트를\n단골님께만 드려요 💛\n이 문자 보여주시면 세트 2,000원 할인 🎁",
    promo: "따뜻한 세트 2,000원 할인 (단골 전용)",
    channels: ["dangol"], coupon: { used: 44, revenue: 61500 },
  },
  heat: {
    label: "폭염", emoji: "🥵", temp: "35°C", cond: "폭염 · 체감 38°C · 자외선 매우 높음",
    diagText: "폭염 낮 −20%", diagTone: "down",
    bars: [62, 70, 58, 66, 72, 48, 75], barToday: 6, todayDown: false,
    normalSales: 840000, predSales: 790000, target: 880000,
    impTone: "down", impHead: "낮 −20% · 저녁 +15% 편중",
    impDetail: "폭염엔 낮 방문이 줄고 저녁에 몰립니다. 17시 이후 에이드 프로모션이 저녁 피크를 앞당기는 데 효과가 컸어요.",
    title: "폭염 쿨다운 저녁 캠페인",
    copy: "🥵 이 더위, 얼음 동동 한 잔이 답입니다 🧊\n오후 5시부터 시그니처 에이드 🍹\n시원하게 준비했어요 ✨\n저녁 방문 시 에이드 20% 할인 🎉",
    promo: "17시 이후 에이드 20% 할인 (오늘)",
    channels: ["instagram", "x", "dangol"], coupon: { used: 33, revenue: 44800 },
  },
};

export const CHANNELS: ChannelMeta[] = [
  { id: "instagram", icon: "📷", label: "인스타그램", desc: "피드 자동 게시", legal: false },
  { id: "x", icon: "𝕏", label: "X (트위터)", desc: "게시물 자동 업로드", legal: false },
  { id: "dangol", icon: "💬", label: "단골 메시지", desc: "쿠폰 포함 · 광고성 정보", legal: true },
];

export const HISTORY: HistoryItem[] = [
  { emoji: "🌧️", title: "비 오는 날 픽업 할인", date: "어제", used: 37, total: 142, revenue: 48100 },
  { emoji: "❄️", title: "한파 단골 온기 쿠폰", date: "3일 전", used: 44, total: 142, revenue: 61500 },
  { emoji: "☀️", title: "맑은 날 테이크아웃", date: "5일 전", used: 29, total: 142, revenue: 39200 },
  { emoji: "🌧️", title: "장마 배달 프로모션", date: "1주 전", used: 41, total: 142, revenue: 53400 },
];
