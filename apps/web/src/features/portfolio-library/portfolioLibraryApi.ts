import { supabase } from "../../lib/supabase";
import type { ReflectionAnalysis, RepositoryAnalysisResult } from "@ptop/contracts";
import type { ReflectionDraft } from "../reflection/reflection";
import {
  createPortfolioProjectPayload,
  mapPortfolioProjectRow,
  type SavedPortfolioProject,
} from "./portfolioLibrary";

const WORKSPACE_MONITOR_SLOT_COUNT = 8;

export async function savePortfolioProject({
  userId,
  result,
  reflectionDraft,
  reflectionAnalysis,
}: {
  userId: string;
  result: RepositoryAnalysisResult;
  reflectionDraft: ReflectionDraft;
  reflectionAnalysis: ReflectionAnalysis;
}): Promise<SavedPortfolioProject> {
  const { data: existingRows, error: existingRowsError } = await supabase
    .from("portfolio_projects")
    .select("id, repository_url, challenge_key, workspace_slot")
    .eq("user_id", userId);

  if (existingRowsError) {
    throw new Error("저장된 작업실 위치를 확인하지 못했습니다.");
  }

  const repositoryUrl = result.repository.url;
  const challengeKey = createPortfolioProjectPayload({
    userId,
    result,
    reflectionDraft,
    reflectionAnalysis,
  }).challenge_key;
  const existingRow = (existingRows ?? []).find(
    (row) => row.repository_url === repositoryUrl && row.challenge_key === challengeKey,
  );
  const existingWorkspaceSlot = existingRow?.workspace_slot;
  const occupiedSlots = new Set(
    (existingRows ?? [])
      .map((row) => row.workspace_slot)
      .filter((slot): slot is number => Number.isInteger(slot) && slot >= 0 && slot < WORKSPACE_MONITOR_SLOT_COUNT),
  );
  const workspaceSlot = typeof existingWorkspaceSlot === "number" && Number.isInteger(existingWorkspaceSlot)
    ? existingWorkspaceSlot
    : Array.from({ length: WORKSPACE_MONITOR_SLOT_COUNT }, (_, index) => index).find(
        (index) => !occupiedSlots.has(index),
      ) ?? null;
  const payload = createPortfolioProjectPayload({
    userId,
    result,
    reflectionDraft,
    reflectionAnalysis,
    workspaceSlot,
  });
  const { data, error } = await supabase
    .from("portfolio_projects")
    .upsert(payload, { onConflict: "user_id,repository_url,challenge_key" })
    .select()
    .single();

  if (error || !data) {
    throw new Error("포트폴리오 초안을 작업실에 저장하지 못했습니다.");
  }

  return mapPortfolioProjectRow(data as Record<string, unknown>);
}

export async function listPortfolioProjects(userId: string): Promise<SavedPortfolioProject[]> {
  const { data, error } = await supabase
    .from("portfolio_projects")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error("저장된 포트폴리오를 불러오지 못했습니다.");
  }

  return (data ?? []).map((row) => mapPortfolioProjectRow(row as Record<string, unknown>));
}
