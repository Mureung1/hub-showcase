import type { ManagerMemory, UserProfile } from "../domain/types";

export const initialProfile: UserProfile = {
  name: "김동민",
  nickname: "루카스",
  primaryGoal: "정보처리기사 자격증 취득",
  category: "study",
  minimumMinutes: 15,
  questSize: "tiny",
  failureResponse: "rebalance",
  managerTone: "friendly",
  publicQuestMode: false,
};

export const initialMemory: ManagerMemory = {
  level: 7,
  exp: 35,
  preferredTimeBlocks: ["밤 9시 이후", "수업 사이 30분"],
  avoidedTimeBlocks: ["알바 직전", "시험 전날 새벽"],
  rewardPreference: ["decor", "collection", "story"],
  recentFailureReasons: [],
};
