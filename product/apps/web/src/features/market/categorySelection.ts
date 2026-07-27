import { analysisCategoryFor } from "./categoryMapping";
import type { Category, CategorySelection } from "./types";

export function quickCategorySelection(category: Category): CategorySelection {
  const analysisCategory = analysisCategoryFor(category);
  return {
    name: category,
    code: null,
    analysisCategory,
    coverage: analysisCategory ? "full" : "partial",
  };
}

export function storeCategorySelection(
  categoryName: string | null,
  categoryCode: string | null = null,
): CategorySelection {
  const name = categoryName?.trim() || "업종 미분류";
  const analysisCategory = analysisCategoryFor(categoryName, categoryCode);
  const isExactSupportedCategory = analysisCategory === name;

  return {
    name,
    code: categoryCode,
    analysisCategory,
    coverage: isExactSupportedCategory ? "full" : categoryName ? "partial" : "unavailable",
  };
}

export function categoryMatchesSelection(categoryName: string, selection: CategorySelection) {
  if (categoryName === selection.name || categoryName.includes(selection.name)) return true;
  return (
    selection.coverage === "full" &&
    analysisCategoryFor(categoryName) === selection.analysisCategory
  );
}
