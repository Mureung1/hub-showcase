import type { AgentAdapter, ManagerMemory, Quest, QuestStatus, UserProfile, WorldState } from "../../domain/types";

export const ruleBasedAgent: AgentAdapter = {
  createDailyQuest(profile: UserProfile): Quest {
    const minutes = profile.questSize === "tiny" ? profile.minimumMinutes : profile.minimumMinutes + 15;

    return {
      id: `q-${profile.category}-${minutes}`,
      title: `${profile.primaryGoal} ${minutes}분 진행`,
      type: "time",
      detail: "사용자 목표와 하루 가능 시간을 바탕으로 만든 오늘의 퀘스트다.",
      target: `${minutes}분 동안 바로 시작 가능한 가장 작은 행동을 수행한다.`,
      rewardExp: profile.questSize === "challenge" ? 60 : 40,
      deadlineLabel: "오늘 끝나기 전",
      visibility: "private",
    };
  },

  rebalanceQuest(quest: Quest, reason: string): Quest {
    return {
      ...quest,
      id: `${quest.id}-recovery`,
      title: quest.title.replace("15분", "5분").replace("진행", "다시 시작"),
      type: "recovery",
      detail: `실패 이유 "${reason}"을 반영해 부담을 낮춘 복구 퀘스트다.`,
      target: "5분만 다시 열어보고 표시 하나 남기기",
      rewardExp: Math.max(8, Math.round(quest.rewardExp * 0.25)),
      deadlineLabel: "오늘 안에",
    };
  },

  getManagerLine(status: QuestStatus, world: WorldState, memory: ManagerMemory): string {
    if (status === "done") return `좋아. 오늘 EXP가 ${memory.exp + 40}만큼 더 선명해졌어.`;
    if (status === "failed") return "사라진 퀘스트도 기록해야 해. 이번에는 크기를 줄여서 다시 맞춰보자.";
    if (status === "accepted") {
      return world.timeOfDay === "night"
        ? "나는 조용히 기다릴게. 너무 크게 잡지 않아도 괜찮아."
        : "진행 중인 퀘스트를 보고 있어. 네 속도로 해내면 돼.";
    }
    return "오늘 가능한 작은 퀘스트로 목표를 나눠보자. 수락 전에 마음대로 고쳐도 돼.";
  },
};
