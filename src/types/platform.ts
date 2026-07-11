import type { ContextAnalysisResultV2 } from "./context";

export type SourceKind = "meeting" | "research" | "feedback" | "note";
export type AnalysisMode = "local" | "openai";
export type AnalysisRunStatus = "running" | "succeeded" | "failed" | "cancelled";

export type CapabilitiesResource = {
  openaiEnabled: boolean;
};

export type ProjectResource = {
  id: string;
  ownerId?: string;
  title: string;
  description: string;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  sourceCount?: number;
  analysisCount?: number;
};

export type SourceRecordResource = {
  id: string;
  projectId: string;
  kind: SourceKind;
  title: string;
  content: string;
  contentSha256?: string;
  charCount: number;
  occurredAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AnalysisRunResource = {
  id: string;
  projectId: string;
  status: AnalysisRunStatus;
  schemaVersion: "2.0";
  sourceIds: string[];
  provider: {
    mode: AnalysisMode;
    name?: string;
    model?: string;
  };
  result?: ContextAnalysisResultV2;
  error?: {
    code: string;
    message: string;
  };
  createdAt: string;
  completedAt?: string | null;
};

export type ShareLinkResource = {
  id: string;
  analysisRunId: string;
  token?: string;
  expiresAt: string;
  revokedAt: string | null;
  createdAt: string;
};

export type PublicContextAnalysisResult = Omit<ContextAnalysisResultV2, "provider">;

export type SharedAnalysisResource = {
  projectTitle: string;
  result: PublicContextAnalysisResult;
  completedAt: string;
  expiresAt: string;
};

export type CreateProjectInput = {
  title: string;
  description?: string;
};

export type UpdateProjectInput = Partial<Pick<ProjectResource, "title" | "description">> & {
  permanentlyDelete?: boolean;
};

export type CreateSourceInput = {
  kind: SourceKind;
  title: string;
  content: string;
  occurredAt?: string | null;
};

export type UpdateSourceInput = Partial<CreateSourceInput>;
