import type { Category } from "./types";

export function analysisCategoryFor(
  categoryName: string | null,
  categoryCode: string | null = null,
): Category | null {
  if (categoryCode === "G20405") return "편의점";
  if (categoryCode === "I21201") return "카페";
  if (categoryCode === "I21001") return "베이커리";
  if (categoryCode && /^I2\d{4}$/.test(categoryCode)) return "음식점";
  if (!categoryName) return null;
  if (categoryName.includes("편의점")) return "편의점";
  if (categoryName.includes("카페") || categoryName.includes("커피")) return "카페";
  if (
    categoryName.includes("베이커리") ||
    categoryName.includes("제과") ||
    categoryName.includes("빵")
  ) {
    return "베이커리";
  }
  if (
    categoryName.includes("음식점") ||
    categoryName.includes("한식") ||
    categoryName.includes("백반") ||
    categoryName.includes("한정식") ||
    categoryName.includes("중식") ||
    categoryName.includes("일식") ||
    categoryName.includes("분식") ||
    categoryName.includes("주점")
  ) {
    return "음식점";
  }
  return null;
}
