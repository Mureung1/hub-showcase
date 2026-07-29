import { analysisCategoryFor } from "./categoryMapping";
import { categoryFocusCode } from "./categorySemantics";
import type { Category, CategorySelection } from "./types";

const topCategoryTerms: Record<string, string[]> = {
  미용: ["미용", "헤어", "네일", "피부관리", "이발"],
  의류: ["의류", "의복", "패션", "옷", "신발"],
  학원: ["학원", "교습", "교육원"],
  숙박: ["숙박", "호텔", "모텔", "여관", "게스트하우스", "펜션"],
  체육: ["체육", "헬스", "피트니스", "스포츠", "요가", "필라테스"],
};

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

export function topCategorySelectionForStore(
  categoryName: string | null,
  categoryCode: string | null = null,
) {
  const analysisCategory = analysisCategoryFor(categoryName, categoryCode);
  if (analysisCategory) return quickCategorySelection(analysisCategory);
  const normalizedName = categoryName?.trim() ?? "";
  const topCategory = Object.entries(topCategoryTerms).find(([, terms]) =>
    terms.some((term) => normalizedName.includes(term)),
  )?.[0];
  return topCategory
    ? quickCategorySelection(topCategory)
    : storeCategorySelection(categoryName, categoryCode);
}

export function categoryMatchesSelection(
  categoryName: string,
  selection: CategorySelection,
  categoryCode: string | null = null,
) {
  if (categoryName === selection.name || categoryName.includes(selection.name)) return true;
  if (topCategoryTerms[selection.name]?.some((term) => categoryName.includes(term))) return true;
  if (
    categoryCode &&
    categoryFocusCode(categoryName, categoryCode) ===
      categoryFocusCode(selection.name, selection.code)
  ) {
    return true;
  }
  return (
    selection.coverage === "full" &&
    analysisCategoryFor(categoryName) === selection.analysisCategory
  );
}
