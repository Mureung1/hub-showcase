import type { MarketAnalysis } from "../../services/marketAnalysis";
import type { Category } from "./types";

export const FLOW_TIME_BUCKET_LABELS = [
  "00:00-06:00",
  "06:00-11:00",
  "11:00-14:00",
  "14:00-17:00",
  "17:00-21:00",
  "21:00-24:00",
];

export const CLUSTER_LABELS: Record<string, string> = {
  ordinary: "일반 상권",
  productive_cluster: "생산적 집적상권",
  specialized_watch: "특화상권 · 판단 보류",
  saturated_cluster: "과포화 후보",
};

export function categoryClass(category: string) {
  return category === "카페"
    ? "green"
    : category === "음식점"
      ? "orange"
      : category === "베이커리"
        ? "blue"
        : "gray";
}

export function formatMarketScore(score: number, category: Category, radius: number) {
  const categoryShift =
    category === "음식점" ? -3 : category === "베이커리" ? 1 : category === "편의점" ? -2 : 0;
  const radiusShift = radius === 100 ? 2 : radius === 500 ? -2 : 0;
  return Math.max(0, Math.min(100, score + categoryShift + radiusShift));
}

export function demandFromFlow(flow: MarketAnalysis["raw"]["flow_time_buckets"]) {
  const availableValues = flow.flatMap((bucket) => (bucket.value === null ? [] : [bucket.value]));
  const maximum = Math.max(...availableValues, 0);
  return flow.map((bucket) =>
    bucket.value === null || maximum <= 0 ? null : Math.round((bucket.value / maximum) * 100),
  );
}

export function circleFeature([longitude, latitude]: [number, number], radiusMeters: number) {
  const points = 64;
  const coordinates = Array.from({ length: points + 1 }, (_, index) => {
    const angle = (index / points) * Math.PI * 2;
    const latitudeOffset = (radiusMeters / 111_320) * Math.sin(angle);
    const longitudeOffset =
      (radiusMeters / (111_320 * Math.cos((latitude * Math.PI) / 180))) * Math.cos(angle);
    return [longitude + longitudeOffset, latitude + latitudeOffset];
  });

  return {
    type: "Feature" as const,
    properties: {},
    geometry: { type: "Polygon" as const, coordinates: [coordinates] },
  };
}

export function isTestEnvironment() {
  return typeof navigator !== "undefined" && navigator.userAgent.includes("jsdom");
}
