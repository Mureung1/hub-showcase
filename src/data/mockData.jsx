import { CloudRain, Clock, Hash } from "lucide-react";

export const PLATFORMS = [
  { id: "instagram", label: "인스타그램", icon: "📸" },
  { id: "blog", label: "블로그", icon: "✍️" },
  { id: "thread", label: "스레드/X", icon: "🧵" },
];

// 기획서상 콘텐츠 맥락 엔진의 3가지 소스: 날씨 API, 공휴일/기념일 API, 큐레이션 키워드 DB
export const CONTEXT_CHIPS = [
  { id: "weather", label: "날씨 반영", icon: <CloudRain size={11} /> },
  { id: "holiday", label: "공휴일·기념일", icon: <Clock size={11} /> },
  { id: "keyword", label: "시즌 키워드", icon: <Hash size={11} /> },
];

export const WEATHER_NOW = {
  icon: <CloudRain size={14} />,
  label: "흐리고 비",
  temp: "18°C",
};

export const HISTORY = [
  { id: 1, preview: "비가 억수로 쏟아지는데 주문 제로 실화냐구요 ㅋㅋ...", temp: 85, time: "오늘 11:20" },
  { id: 2, preview: "30분간 정성을 다해 완성한 음식이 돌아올 때의 그 감정...", temp: 22, time: "오늘 09:45" },
  { id: 3, preview: "배달 수수료 계산하다가 잠깐 멍했습니다 재료비+인건비+...", temp: 76, time: "어제 18:33" },
];

export const EXAMPLE_RESULTS = {
  0: {
    cold:
      "비 내리는 오후, 텅 빈 홀을 바라보며 조용히 앉아있습니다.\n\n준비한 재료들이 저를 말없이 바라보는 것 같아 마음이 먹먹해지네요. 오늘 하루는 내일을 위해 숨 고르는 시간으로 삼아야겠습니다. 🌧️\n\n그래도 오셨다면, 따뜻하게 맞이할 준비는 되어 있습니다.",
    hot:
      "비가 억수로 쏟아지는데 주문 제로 실화냐구요 ㅋㅋㅋ\n\n저희 재료들이 저한테 '사장님... 우리 이제 어떡해요?' 하고 쳐다보는 눈빛 ㅠㅠ 아니 근데 비 오는 날엔 따끈한 거 더 먹어야 하지 않나요??\n\n오세요~ 비 뚫고 오시면 서비스 드립니다 ☔🔥",
  },
};

// 결과 없을 때(empty state) 보여주는 빠른 입력 예시
export const QUICK_EXAMPLES = [
  "비 오는 날 주문 없음 😭",
  "환불 요청 속상해요",
  "수수료가 너무 높아요",
  "진상 손님 등장...",
];

export const HASHTAG_SUGGESTIONS = [
  "#사장님일기",
  "#맛집",
  "#비오는날",
  "#하소연",
  "#솔직함이마케팅",
];
