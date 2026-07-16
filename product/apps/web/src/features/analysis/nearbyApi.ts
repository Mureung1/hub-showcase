import { apiUrl } from "../../services/api";
import type { AnalysisRadius, NearbyStoreResponse } from "./types";

export type NearbyRequest = {
  center: [number, number];
  radius: AnalysisRadius;
  category: string;
};

export class NearbyApiError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`Nearby API ${status}`);
    this.status = status;
  }
}

function isNearbyStoreResponse(value: unknown): value is NearbyStoreResponse {
  if (!value || typeof value !== "object") return false;
  const response = value as Partial<NearbyStoreResponse>;
  return (
    response.aggregation_scope === "radius" &&
    typeof response.total_count === "number" &&
    typeof response.same_category_count === "number" &&
    Boolean(response.category_coverage) &&
    Array.isArray(response.stores) &&
    Array.isArray(response.evidence)
  );
}

export async function loadNearbyStores(request: NearbyRequest, signal: AbortSignal) {
  const [longitude, latitude] = request.center;
  const parameters = new URLSearchParams({
    longitude: String(longitude),
    latitude: String(latitude),
    radius: String(request.radius),
    category: request.category,
  });
  const response = await fetch(apiUrl(`/api/v1/stores/nearby?${parameters}`), { signal });
  if (!response.ok) throw new NearbyApiError(response.status);
  const payload: unknown = await response.json();
  if (!isNearbyStoreResponse(payload)) throw new Error("Nearby API returned an invalid payload.");
  return payload;
}
