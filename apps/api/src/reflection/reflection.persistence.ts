import { Injectable } from "@nestjs/common";
import type {
  ReflectionDraft,
  ReflectionAnalysis,
  ReflectionDraftSaveResponse,
} from "@ptop/contracts";
import { SupabaseClientService } from "../supabase/supabase-client.service";

type ReflectionDraftRow = {
  analysis_result_id: string;
  draft: ReflectionDraft;
  reflection_analysis: ReflectionAnalysis | null;
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
    reflectionAnalysis: ReflectionAnalysis | null = null,
  ): Promise<ReflectionDraftSaveResponse> {
    const query = this.supabase.client
      .from("reflection_drafts")
      .upsert(
        {
          analysis_result_id: analysisResultId,
          draft,
          reflection_analysis: reflectionAnalysis,
        },
        { onConflict: "analysis_result_id" },
      );
    const { data, error } = await query
      .select("analysis_result_id, draft, reflection_analysis, updated_at")
      .single();

    if (isMissingReflectionAnalysisColumn(error)) {
      return this.saveWithoutReflectionAnalysis(analysisResultId, draft, reflectionAnalysis);
    }

    if (error || !isReflectionDraftRow(data)) {
      throw new ReflectionDraftPersistenceError();
    }

    return {
      analysisResultId: data.analysis_result_id,
      draft: data.draft,
      savedAt: data.updated_at,
      reflectionAnalysis: data.reflection_analysis ?? null,
    };
  }

  async find(analysisResultId: string): Promise<ReflectionDraftSaveResponse | null> {
    const query = this.supabase.client
      .from("reflection_drafts")
      .select("analysis_result_id, draft, reflection_analysis, updated_at")
      .eq("analysis_result_id", analysisResultId)
      ;
    const { data, error } = await query.maybeSingle();

    if (isMissingReflectionAnalysisColumn(error)) {
      return this.findWithoutReflectionAnalysis(analysisResultId);
    }

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
      reflectionAnalysis: data.reflection_analysis ?? null,
    };
  }

  private async saveWithoutReflectionAnalysis(
    analysisResultId: string,
    draft: ReflectionDraft,
    reflectionAnalysis: ReflectionAnalysis | null,
  ): Promise<ReflectionDraftSaveResponse> {
    const { data, error } = await this.supabase.client
      .from("reflection_drafts")
      .upsert(
        { analysis_result_id: analysisResultId, draft },
        { onConflict: "analysis_result_id" },
      )
      .select("analysis_result_id, draft, updated_at")
      .single();

    if (error || !isLegacyReflectionDraftRow(data)) {
      throw new ReflectionDraftPersistenceError();
    }

    return {
      analysisResultId: data.analysis_result_id,
      draft: data.draft,
      savedAt: data.updated_at,
      reflectionAnalysis,
    };
  }

  private async findWithoutReflectionAnalysis(
    analysisResultId: string,
  ): Promise<ReflectionDraftSaveResponse | null> {
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

    if (!isLegacyReflectionDraftRow(data)) {
      throw new ReflectionDraftLoadError();
    }

    return {
      analysisResultId: data.analysis_result_id,
      draft: data.draft,
      savedAt: data.updated_at,
      reflectionAnalysis: null,
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

function isLegacyReflectionDraftRow(
  value: unknown,
): value is Omit<ReflectionDraftRow, "reflection_analysis"> {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.analysis_result_id === "string" &&
    typeof value.updated_at === "string" &&
    isRecord(value.draft)
  );
}

function isMissingReflectionAnalysisColumn(error: unknown): boolean {
  if (!isRecord(error)) {
    return false;
  }

  return (
    error.code === "42703" ||
    (typeof error.message === "string" &&
      error.message.includes("reflection_analysis"))
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
