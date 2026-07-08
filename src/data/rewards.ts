import type { ExpansionFeature, RewardItem } from "../domain/types";

export const rewardItems: RewardItem[] = [
  {
    id: "lamp",
    name: "작은 램프",
    category: "decor",
    description: "저녁 퀘스트를 끝내면 방에 따뜻한 빛이 켜진다.",
    unlocked: true,
  },
  {
    id: "memory-star",
    name: "기억 별",
    category: "memory",
    description: "성공한 퀘스트가 우주 조각으로 보관된다.",
    unlocked: true,
  },
  {
    id: "seed",
    name: "회복 씨앗",
    category: "recovery",
    description: "복구 퀘스트 성공 시 자라는 작은 보상.",
    unlocked: false,
  },
  {
    id: "tv",
    name: "픽셀 TV",
    category: "decor",
    description: "현실 장면을 픽셀화해 방 안 TV에서 보여준다.",
    unlocked: false,
  },
];

export const expansionFeatures: ExpansionFeature[] = [
  {
    id: "personal-llm",
    title: "개인 LLM 매니저",
    status: "adapter-ready",
    description: "기억은 앱 데이터로 보관하고, LLM은 문장화와 리포트 생성에만 연결한다.",
  },
  {
    id: "voice",
    title: "음성 입력",
    status: "adapter-ready",
    description: "목표, 완료 기록, 실패 이유를 말로 입력하는 VoiceInput 어댑터.",
  },
  {
    id: "gesture",
    title: "웹캠 손 제스처",
    status: "future-lab",
    description: "MediaPipe 계열 손 인식으로 우주 조각 탐색을 조작한다.",
  },
  {
    id: "pixel-tv",
    title: "현실 픽셀화 TV",
    status: "future-lab",
    description: "웹캠/이미지를 canvas로 낮은 해상도 변환해 방 안 TV에 출력한다.",
  },
  {
    id: "social-space",
    title: "퀘스트 우주 탐색",
    status: "future-lab",
    description: "공개를 선택한 퀘스트만 우주 조각이나 꽃밭 오브젝트로 탐색한다.",
  },
];
