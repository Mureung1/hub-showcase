import { analysisCategoryFor } from "./categoryMapping";
import type { Category, CategorySelection } from "./types";

const supportedCategories: readonly Category[] = ["카페", "음식점", "베이커리", "편의점"];

export function quickCategorySelection(category: Category): CategorySelection {
  return {
    name: category,
    code: null,
    analysisCategory: category,
    coverage: "full",
  };
}

export function storeCategorySelection(
  categoryName: string | null,
  categoryCode: string | null = null,
): CategorySelection {
  const name = categoryName?.trim() || "업종 미분류";
  const analysisCategory = analysisCategoryFor(categoryName, categoryCode);
  const isExactSupportedCategory = supportedCategories.includes(name as Category);

  return {
    name,
    code: categoryCode,
    analysisCategory,
    coverage: isExactSupportedCategory ? "full" : categoryName ? "partial" : "unavailable",
  };
}

export function categoryMatchesSelection(categoryName: string, selection: CategorySelection) {
  if (categoryName === selection.name) return true;
  return (
    selection.coverage === "full" &&
    analysisCategoryFor(categoryName) === selection.analysisCategory
  );
}
