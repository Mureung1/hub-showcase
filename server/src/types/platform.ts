export type PlatformId = "naver" | "kakao" | "delivery";

export type PlatformConnectionStatus =
  | "connected"
  | "reconnect_required"
  | "disconnected";

export interface Platform {
  id: PlatformId;
  name: string;
  supportsAutoUpdate: boolean;
  editUrl: string;
}

export interface PlatformConnection {
  platformId: PlatformId;
  status: PlatformConnectionStatus;
  connectedAt: string | null;
  expiresAt: string | null;
}

export interface PriceDelta {
  platformId: PlatformId;
  delta: number;
}

export interface PricePolicy {
  platformDefaults: PriceDelta[];
  categoryOverrides: { categoryId: string; deltas: PriceDelta[] }[];
  menuOverrides: { menuItemId: string; deltas: PriceDelta[] }[];
}

export interface VisibilityPolicy {
  categoryDefaults: { categoryId: string; platformIds: PlatformId[] }[];
  menuOverrides: { menuItemId: string; platformIds: PlatformId[] }[];
}
