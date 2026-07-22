import { Injectable } from "@nestjs/common";
import type {
  ReflectionDraft,
  ReflectionDraftSaveResponse,
} from "@ptop/contracts";
import { SupabaseClientService } from "../supabase/supabase-client.service";

type ReflectionDraftRow = {
  analysis_result_id: string;
  draft: ReflectionDraft;
  updated_at: string;
};

export class ReflectionDraftPersistenceError extends Error {
  constructor() {
    super("회고 저장에 실패했습니다.");
    this.name = "ReflectionDraftPersistenceError";
  }
}

export class ReflectionDraftLoadError extends Error {
  constructor() {
    super("회고 조회에 실패했습니다.");
    this.name = "ReflectionDraftLoadError";
  }
}

@Injectable()
export class ReflectionDraftPersistence {
  constructor(private readonly supabase: SupabaseClientService) {}

  async save(
    analysisResultId: string,
    draft: ReflectionDraft,
  ): Promise<ReflectionDraftSaveResponse> {
    const { data, error } = await this.supabase.client
      .from("reflection_drafts")
      .upsert(
        { analysis_result_id: analysisResultId, draft },
        { onConflict: "analysis_result_id" },
      )
      .select("analysis_result_id, draft, updated_at")
      .single();

    if (error || !isReflectionDraftRow(data)) {
      throw new ReflectionDraftPersistenceError();
    }

    return {
      analysisResultId: data.analysis_result_id,
      draft: data.draft,
      savedAt: data.updated_at,
    };
  }

  async find(analysisResultId: string): Promise<ReflectionDraftSaveResponse | null> {
    const { data, error } = await this.supabase.client
      .from("reflection_drafts")
      .select("analysis_result_id, draft, updated_at")
      .eq("analysis_result_id", analysisResultId)
      .maybeSingle();

    if (error) {
      throw new ReflectionDraftLoadError();
    }

    if (data === null) {
      return null;
    }

    if (!isReflectionDraftRow(data)) {
      throw new ReflectionDraftLoadError();
    }

    return {
      analysisResultId: data.analysis_result_id,
      draft: data.draft,
      savedAt: data.updated_at,
    };
  }
}

function isReflectionDraftRow(value: unknown): value is ReflectionDraftRow {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.analysis_result_id === "string" &&
    typeof value.updated_at === "string" &&
    isRecord(value.draft)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
