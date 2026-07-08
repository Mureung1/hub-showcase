export type ThemeId = "xp" | "lofi";

export type QuestStatus = "draft" | "accepted" | "done" | "failed";

export type QuestType = "time" | "quantity" | "action" | "recovery";

export type TimeOfDay = "morning" | "afternoon" | "evening" | "night";

export type SocialVisibility = "private" | "anonymous_public" | "friends_only";

export interface UserProfile {
  name: string;
  nickname: string;
  primaryGoal: string;
  category: "study" | "exercise" | "hobby" | "career" | "habit";
  minimumMinutes: number;
  questSize: "tiny" | "balanced" | "challenge";
  failureResponse: "rebalance" | "encourage" | "analysis";
  managerTone: "calm" | "friendly" | "firm";
  publicQuestMode: boolean;
}

export interface ManagerMemory {
  level: number;
  exp: number;
  preferredTimeBlocks: string[];
  avoidedTimeBlocks: string[];
  rewardPreference: Array<"decor" | "story" | "collection" | "stats" | "social">;
  recentFailureReasons: string[];
}

export interface Quest {
  id: string;
  title: string;
  type: QuestType;
  detail: string;
  target: string;
  rewardExp: number;
  deadlineLabel: string;
  visibility: SocialVisibility;
}

export interface RewardItem {
  id: string;
  name: string;
  category: "decor" | "memory" | "sound" | "recovery" | "season";
  description: string;
  unlocked: boolean;
}

export interface ExpansionFeature {
  id: string;
  title: string;
  status: "mvp-ready" | "adapter-ready" | "future-lab";
  description: string;
}

export interface SocialQuestShard {
  id: string;
  title: string;
  ownerLabel: string;
  motif: "star" | "flower" | "scrap";
  visibility: Exclude<SocialVisibility, "private">;
}

export interface WorldState {
  timeOfDay: TimeOfDay;
  theme: ThemeId;
  managerMood: "waiting" | "focused" | "happy" | "recovering";
  tvMode: "idle" | "pixel-reality" | "quest-log";
}

export interface AgentAdapter {
  createDailyQuest(profile: UserProfile): Quest;
  rebalanceQuest(quest: Quest, reason: string): Quest;
  getManagerLine(status: QuestStatus, world: WorldState, memory: ManagerMemory): string;
}
