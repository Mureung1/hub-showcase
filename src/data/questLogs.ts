export type QuestLogResult = "success" | "failed" | "recovery";

export interface QuestLog {
  id: string;
  title: string;
  result: QuestLogResult;
  exp: number;
  reason?: string;
  createdAt: string;
}

export interface QuestLogInput {
  title: string;
  result: QuestLogResult;
  exp: number;
  reason?: string;
}

export const questLogResultLabels: Record<QuestLogResult, string> = {
  success: "\uC644\uB8CC",
  failed: "\uC2E4\uD328",
  recovery: "\uBCF5\uAD6C \uC644\uB8CC",
};

export const questLogMarks: Record<QuestLogResult, string> = {
  success: "\u2713",
  failed: "\u00D7",
  recovery: "\u21BA",
};

export function formatQuestLogDate(date: Date) {
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

export function createQuestLog(input: QuestLogInput, now = new Date()): QuestLog {
  return {
    id: `${now.getTime()}-${Math.random().toString(16).slice(2)}`,
    title: input.title,
    result: input.result,
    exp: input.exp,
    reason: input.reason,
    createdAt: formatQuestLogDate(now),
  };
}

export function prependQuestLog(logs: QuestLog[], log: QuestLog, limit = 8) {
  return [log, ...logs].slice(0, limit);
}
