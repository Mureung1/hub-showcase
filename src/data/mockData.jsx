import { CloudRain, Clock, Hash } from "lucide-react";

export const PLATFORMS = [
  { id: "instagram", label: "인스타그램", icon: "📸" },
  { id: "thread", label: "스레드/X", icon: "🧵" },
  { id: "blog", label: "네이버 블로그", icon: "✍️" },
];

// 기획서 스펙: 인스타 150자 / 스레드·X 150자 / 블로그 700자
export const PLATFORM_CHAR_LIMITS = {
  instagram: 150,
  thread: 150,
  blog: 700,
};

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

export const QUICK_EXAMPLES = [
  "비 오는 날 주문 없음 😭",
  "환불 요청 속상해요",
  "수수료가 너무 높아요",
  "진상 손님 등장...",
];

export const HASHTAG_SUGGESTIONS = [
  "#소상공인",
  "#사장님일기",
  "#맛집",
  "#비오는날",
  "#하소연",
  "#솔직함이마케팅",
];
