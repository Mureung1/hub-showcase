import type { QuestLog } from "../../data/questLogs";
import { createLocalRepository } from "./localRepositories";

export const questLogsKey = "manager-xp.logs.v1";

export function createQuestLogRepository() {
  return createLocalRepository<QuestLog[]>(questLogsKey, []);
}
