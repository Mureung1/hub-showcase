import { supabase } from "../../lib/supabase";
import type { ReflectionAnalysis, RepositoryAnalysisResult } from "@ptop/contracts";
import type { ReflectionDraft } from "../reflection/reflection";
import {
  createPortfolioProjectPayload,
  mapPortfolioProjectRow,
  type SavedPortfolioProject,
} from "./portfolioLibrary";

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
  const payload = createPortfolioProjectPayload({
    userId,
    result,
    reflectionDraft,
    reflectionAnalysis,
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
