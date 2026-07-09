import type { PlatformId } from "./platform.js";

export type ChangeItemType =
  | "business_hours"
  | "holiday"
  | "menu"
  | "price"
  | "notice";

export interface ChangeItem {
  type: ChangeItemType;
  targetId?: string;
  beforeValue: unknown;
  afterValue: unknown;
}

export type ChangeSetStatus =
  | "draft"
  | "approved"
  | "processing"
  | "completed"
  | "partial_failed";

export interface ChangeSet {
  id: string;
  storeId: string;
  createdBy: string;
  changeType: "permanent" | "temporary";
  startAt?: string;
  endAt?: string;
  items: ChangeItem[];
  targetPlatforms: PlatformId[];
  status: ChangeSetStatus;
  createdAt: string;
}
