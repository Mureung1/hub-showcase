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
  return category.includes("카페") || category.includes("커피")
    ? "green"
    : category.includes("음식점") || category.includes("한식") || category.includes("중식") || category.includes("일식") || category.includes("분식") || category.includes("주점")
      ? "orange"
      : category.includes("베이커리") || category.includes("제과") || category.includes("빵") || category.includes("도넛")
        ? "blue"
        : category.includes("미용") || category.includes("헤어") || category.includes("네일") || category.includes("피부관리")
          ? "pink"
          : category.includes("의류") || category.includes("의복") || category.includes("패션") || category.includes("신발")
            ? "violet"
            : category.includes("학원") || category.includes("교습") || category.includes("교육원")
              ? "cyan"
              : category.includes("숙박") || category.includes("호텔") || category.includes("모텔") || category.includes("여관")
                ? "plum"
                : category.includes("체육") || category.includes("헬스") || category.includes("피트니스") || category.includes("스포츠") || category.includes("요가") || category.includes("필라테스")
                  ? "red"
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

export function isTestEnvironment() {
  return typeof navigator !== "undefined" && navigator.userAgent.includes("jsdom");
}
