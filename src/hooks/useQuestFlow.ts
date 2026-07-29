import type { Dispatch, SetStateAction } from "react";
import type { WindowId } from "../data/windowRegistry";
import type { CreateQuestEventRequest } from "../layers/storage/questLogApi";
import type { ManagerState, UserProfile } from "../domain/appState";
import { getPersonaLine } from "../domain/managerPersonaPolicy";
import { applyDifficultyEvaluationToQuest, applyQuestPatch, getQuestCompletionResult, getQuestWorkflowWindows, type QuestStatus } from "../domain/questFlowPolicy";
import { createRecoveryQuest, type Quest } from "../domain/questLogic";

export interface UseQuestFlowInput {
  quest: Quest;
  questStatus: QuestStatus;
  profile: UserProfile;
  manager: ManagerState;
  selectedFailureReason: string;
  setQuest: Dispatch<SetStateAction<Quest>>;
  setQuestStatus: Dispatch<SetStateAction<QuestStatus>>;
  setManager: Dispatch<SetStateAction<ManagerState>>;
  setPreviousQuestTitle: Dispatch<SetStateAction<string>>;
  setWorkflowWindows: (nextWindows: WindowId[]) => void;
  resetOpenWindows: (nextWindows: WindowId[]) => void;
  openWindow: (id: WindowId) => void;
  createQuest: (profile: UserProfile) => Quest;
  addExp: (manager: ManagerState, exp: number, line: string) => ManagerState;
  getManagerPersona: (manager: ManagerState, profile: UserProfile) => Parameters<typeof getPersonaLine>[1];
  recordOutcomeStreak: (result: "success" | "failed") => void;
  saveQuestEvent: (request: CreateQuestEventRequest) => void;
  recommendQuest?: () => void;
  reevaluateQuestBeforeAccept?: (quest: Quest) => Promise<{ difficulty: Quest["difficulty"]; rewardExp: number } | null>;
  createQuestEventRequest: (
    quest: Quest,
    result: NonNullable<CreateQuestEventRequest["result"]>,
    expDelta: number,
    managerMoodAfter: ManagerState["mood"],
    options?: {
      failureReason?: string | null;
      previousQuestTitle?: string | null;
      managerLine?: string | null;
      managerBefore?: ManagerState;
      managerAfter?: ManagerState;
      soundEnabled?: boolean;
    },
  ) => CreateQuestEventRequest;
}

export function useQuestFlow({
  quest,
  questStatus,
  profile,
  manager,
  selectedFailureReason,
  setQuest,
  setQuestStatus,
  setManager,
  setPreviousQuestTitle,
  setWorkflowWindows,
  resetOpenWindows,
  openWindow,
  createQuest,
  addExp,
  getManagerPersona,
  recordOutcomeStreak,
  saveQuestEvent,
  recommendQuest,
  reevaluateQuestBeforeAccept,
  createQuestEventRequest,
}: UseQuestFlowInput) {
  function openTodayQuest() {
    if (questStatus === "success") {
      setQuest(createQuest(profile));
      setQuestStatus("draft");
      setPreviousQuestTitle("");
      setManager((current) => ({ ...current, mood: "waiting", line: getPersonaLine("quest_recommended", getManagerPersona(current, profile)) }));
      setWorkflowWindows(["quest", "manager"]);
      recommendQuest?.();
      return;
    }

    const workflowWindows = getQuestWorkflowWindows(questStatus);
    if (workflowWindows) {
      setWorkflowWindows(workflowWindows);
      return;
    }

    openWindow("quest");
  }

  function updateQuest(patch: Partial<Quest>) {
    setQuest((current) => applyQuestPatch(current, patch));
  }

  async function acceptQuest() {
    let acceptedQuest = quest;
    if (reevaluateQuestBeforeAccept) {
      try {
        const evaluation = await reevaluateQuestBeforeAccept(quest);
        if (evaluation) {
          acceptedQuest = applyDifficultyEvaluationToQuest(quest, evaluation);
          setQuest(acceptedQuest);
        }
      } catch {
        acceptedQuest = quest;
      }
    }

    setQuestStatus("active");
    setWorkflowWindows(["runner", "manager"]);
    setManager((current) => ({ ...current, mood: "focused", line: getPersonaLine("quest_started", getManagerPersona(current, profile)) }));
  }

  function completeQuest() {
    const result = getQuestCompletionResult(questStatus);
    recordOutcomeStreak("success");
    const eventLine = getPersonaLine("quest_completed", getManagerPersona(manager, profile));
    const nextManager = addExp(manager, quest.rewardExp, eventLine);
    setManager((current) => addExp(current, quest.rewardExp, getPersonaLine("quest_completed", getManagerPersona(current, profile))));
    saveQuestEvent(createQuestEventRequest(quest, result, quest.rewardExp, "happy", { managerLine: eventLine, managerBefore: manager, managerAfter: nextManager, soundEnabled: manager.soundEnabled }));
    setQuestStatus("success");
    setWorkflowWindows(["manager"]);
  }

  function startFailureFlow() {
    setQuestStatus("failed");
    setManager((current) => ({ ...current, mood: "recovering", line: getPersonaLine("quest_failed", getManagerPersona(current, profile)) }));
    setWorkflowWindows(["failure", "manager"]);
  }

  function createRecovery() {
    recordOutcomeStreak("failed");
    setPreviousQuestTitle(quest.title);
    saveQuestEvent(createQuestEventRequest(quest, "failed", 0, "recovering", { failureReason: selectedFailureReason, managerLine: getPersonaLine("quest_failed", getManagerPersona(manager, profile)), managerBefore: manager, managerAfter: manager, soundEnabled: manager.soundEnabled }));
    setQuest(createRecoveryQuest(quest));
    setQuestStatus("recovery");
    setWorkflowWindows(["recovery", "manager"]);
    setManager((current) => ({ ...current, mood: "recovering", line: getPersonaLine("recovery_created", getManagerPersona(current, profile)) }));
  }

  function editRecovery() {
    resetOpenWindows(["quest"]);
  }

  return {
    openTodayQuest,
    updateQuest,
    acceptQuest,
    completeQuest,
    startFailureFlow,
    createRecovery,
    editRecovery,
  };
}
