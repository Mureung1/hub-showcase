import type { MarketAnalysis } from "../../services/marketAnalysis";
import { categoryTone } from "./categorySemantics";
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
  return categoryTone(category);
}

export function formatMarketScore(score: number, category: Category, radius: number) {
  const categoryShift =
    category === "음식점" ? -3 : category === "베이커리" ? 1 : category === "편의점" ? -2 : 0;
  const radiusShift = radius === 100 ? 2 : radius === 500 ? -2 : 0;
  return Math.max(0, Math.min(100, score + categoryShift + radiusShift));
}

export function flowBucketDurationHours(label: string) {
  const match = /^(\d{2}):(\d{2})-(\d{2}):(\d{2})$/.exec(label);
  if (!match) return 1;
  const startMinutes = Number(match[1]) * 60 + Number(match[2]);
  const endMinutes = Number(match[3]) * 60 + Number(match[4]);
  const durationHours = (endMinutes - startMinutes) / 60;
  return durationHours > 0 ? durationHours : 1;
}

export function flowBucketHourlyAverage(
  bucket: MarketAnalysis["raw"]["flow_time_buckets"][number] | undefined,
) {
  if (!bucket || bucket.value === null) return null;
  return bucket.value / flowBucketDurationHours(bucket.label);
}

export function hourlyAverageFlow(flow: MarketAnalysis["raw"]["flow_time_buckets"]) {
  return flow.map((bucket) => flowBucketHourlyAverage(bucket));
}

export function demandFromFlow(flow: MarketAnalysis["raw"]["flow_time_buckets"]) {
  const hourlyValues = hourlyAverageFlow(flow);
  const availableValues = hourlyValues.flatMap((value) => (value === null ? [] : [value]));
  const maximum = Math.max(...availableValues, 0);
  return hourlyValues.map((value) =>
    value === null || maximum <= 0 ? null : Math.round((value / maximum) * 100),
  );
}

export function isTestEnvironment() {
  return typeof navigator !== "undefined" && navigator.userAgent.includes("jsdom");
}
