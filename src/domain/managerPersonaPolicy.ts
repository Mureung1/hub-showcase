import type { PetBehaviorStyle } from "./petBehaviorStateMachine";

export type ManagerTone = "calm" | "friendly" | "firm";
export type ManagerQuestStyle = "tiny" | "balanced" | "challenge";
export type ManagerFeedbackStyle = "gentle" | "playful" | "direct";

export interface ManagerPersona {
  tone: ManagerTone;
  questStyle: ManagerQuestStyle;
  feedbackStyle: ManagerFeedbackStyle;
  behaviorStyle: PetBehaviorStyle;
}

export type ManagerLineEvent =
  | "setup"
  | "quest_recommended"
  | "quest_started"
  | "quest_completed"
  | "quest_failed"
  | "recovery_created"
  | "context_success"
  | "context_failed"
  | "context_recovery"
  | "context_idle"
  | "api_error";

export interface ResolveManagerPersonaInput {
  petId: string;
  tone: ManagerTone;
  questStyle: ManagerQuestStyle;
}

export function resolveManagerPersona(input: ResolveManagerPersonaInput): ManagerPersona {
  return {
    tone: input.tone,
    questStyle: input.questStyle,
    feedbackStyle: getFeedbackStyle(input.tone),
    behaviorStyle: getBehaviorStyle(input.petId, input.tone),
  };
}

export function getPersonaLine(event: ManagerLineEvent, persona: ManagerPersona): string {
  return personaLines[persona.feedbackStyle][event];
}

function getFeedbackStyle(tone: ManagerTone): ManagerFeedbackStyle {
  if (tone === "calm") return "gentle";
  if (tone === "firm") return "direct";
  return "playful";
}

function getBehaviorStyle(petId: string, tone: ManagerTone): PetBehaviorStyle {
  if (tone === "firm") return "adventurous";
  if (tone === "calm") return "shy";
  if (petId === "glass-frog") return "adventurous";
  if (petId === "planaria") return "shy";
  return "balanced";
}

const personaLines: Record<ManagerFeedbackStyle, Record<ManagerLineEvent, string>> = {
  gentle: {
    setup: "좋아. 어떤 목표를 천천히 함께 키울지 알려줘.",
    quest_recommended: "새 오늘의 퀘스트 초안을 작게 준비했어. 부담 없는 분량부터 보자.",
    quest_started: "끝까지 기다릴게. 네 속도로 진행하면 돼.",
    quest_completed: "오늘 기록이 쌓였어. 다음에도 작은 걸로 이어가자.",
    quest_failed: "이번 기록을 보고 다음 분량을 더 편하게 맞춰볼게.",
    recovery_created: "다시 시작할 수 있는 작은 분량으로 준비했어.",
    context_success: "완료 기록을 기억으로 정리했어. 다음 추천에 조용히 반영할게.",
    context_failed: "실패 이유를 기억해뒀어. 다음 퀘스트는 더 작게 맞춰볼게.",
    context_recovery: "복구 흐름까지 기억했어. 다시 이어간 기록이 남았어.",
    context_idle: "오늘 흐름을 조용히 정리하고 있어.",
    api_error: "기록 저장이 잠시 실패했어. 그래도 오늘의 흐름은 이어갈 수 있어.",
  },
  playful: {
    setup: "좋아. 어떤 목표를 같이 키워볼지 알려줘.",
    quest_recommended: "새 퀘스트 초안을 준비했어. 이번에도 가볍게 한 판 가보자.",
    quest_started: "좋아, 옆에서 같이 달려볼게. 지금 페이스로 가자.",
    quest_completed: "좋았다. 오늘 기록 하나가 반짝 남았어.",
    quest_failed: "괜찮아. 실패 이유를 챙겼으니 더 작은 퀘스트로 다시 굴려보자.",
    recovery_created: "복구용 작은 퀘스트를 준비했어. 이번 건 훨씬 가볍게 가자.",
    context_success: "완료 기록을 기억으로 정리했어. 다음 추천에 써먹어볼게.",
    context_failed: "실패 이유를 기억했어. 다음엔 더 귀여운 크기로 줄여볼게.",
    context_recovery: "복구까지 이어간 기록이 남았어. 이건 꽤 좋은 흐름이야.",
    context_idle: "오늘 흐름을 살짝 정리하는 중이야.",
    api_error: "기록 저장이 잠깐 삐끗했어. 그래도 진행은 계속할 수 있어.",
  },
  direct: {
    setup: "좋아. 목표를 입력해. 바로 실행 가능한 퀘스트로 나누겠다.",
    quest_recommended: "새 퀘스트 초안을 준비했다. 가능한 분량부터 바로 정하자.",
    quest_started: "시작했다. 완료 조건만 보고 끝까지 가자.",
    quest_completed: "완료 기록을 반영했다. 다음 실행으로 이어가자.",
    quest_failed: "실패 이유를 확인했다. 분량을 줄여 다시 설계하겠다.",
    recovery_created: "복구 퀘스트를 준비했다. 작게 다시 시작하자.",
    context_success: "완료 기록을 저장했다. 다음 추천에 반영한다.",
    context_failed: "실패 이유를 저장했다. 다음 퀘스트는 더 작고 명확하게 조정한다.",
    context_recovery: "복구 완료 기록을 저장했다. 이어간 흐름을 유지하자.",
    context_idle: "오늘 기록을 정리 중이다.",
    api_error: "기록 저장에 실패했다. 화면 흐름은 유지하고 나중에 다시 확인하자.",
  },
};
