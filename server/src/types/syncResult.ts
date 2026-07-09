import type { PlatformId } from "./platform.js";

export type SyncStatus =
  | "pending"
  | "sending"
  | "sent"
  | "platform_reviewing"
  | "reflected"
  | "failed"
  | "needs_attention";

export interface SyncResult {
  platformId: PlatformId;
  status: SyncStatus;
  requestedAt: string | null;
  updatedAt: string | null;
  failureReason: string | null;
  retryCount: number;
}

export interface ConflictItem {
  platformId: PlatformId;
  field: "business_hours" | "holiday" | "menu" | "price";
  baseValue: unknown;
  platformValue: unknown;
  detectedAt: string;
}
