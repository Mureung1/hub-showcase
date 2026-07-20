import { useCallback, useState } from "react";

import {
  quickCategorySelection,
  storeCategorySelection,
} from "../market/categorySelection";
import type { AnalysisTopic, Category, CategorySelection } from "../market/types";
import type { AnalysisUrlState } from "./analysisUrlState";
import type { NearbyStoreResponse } from "./types";

export function useAnalysisSelection(initial: AnalysisUrlState) {
  const [marketKey, setMarketKey] = useState(initial.marketKey);
  const [category, setCategory] = useState<Category>(initial.category);
  const [categorySelection, setCategorySelection] = useState<CategorySelection>(() =>
    storeCategorySelection(initial.selectedCategoryName, initial.selectedCategoryCode),
  );
  const [radius, setRadius] = useState(initial.radius);
  const [activeHour, setActiveHour] = useState(2);
  const [layer, setLayer] = useState(initial.layer);
  const [analysisScope, setAnalysisScope] = useState(initial.scope);
  const [analysisTopic, setAnalysisTopic] = useState(initial.topic);
  const [boundaryVisible, setBoundaryVisible] = useState(initial.boundaryVisible);
  const [storesVisible, setStoresVisible] = useState(initial.storesVisible);
  const [period, setPeriod] = useState(initial.period);
  const syncCategoryCoverage = useCallback(
    (coverage: NearbyStoreResponse["category_coverage"] | undefined) => {
      if (!coverage) return;
      setCategorySelection((current) =>
        coverage.requested_category !== current.name ||
        (coverage.status === current.coverage &&
          coverage.analysis_category === current.analysisCategory)
          ? current
          : {
              ...current,
              coverage: coverage.status,
              analysisCategory: coverage.analysis_category,
            },
      );
    },
    [],
  );

  function applyCategorySelection(next: CategorySelection) {
    setCategorySelection(next);
    if (next.analysisCategory) setCategory(next.analysisCategory);
    if (next.coverage !== "full") {
      setAnalysisScope("radius");
      setAnalysisTopic("competition");
      setLayer("density");
    }
  }

  function chooseCategory(next: Category) {
    setCategory(next);
    setCategorySelection(quickCategorySelection(next));
  }

  function chooseTopic(next: AnalysisTopic) {
    setAnalysisTopic(next);
    if (next === "flow") setLayer("demand");
    if (next === "competition") setLayer("density");
  }

  return {
    marketKey,
    setMarketKey,
    category,
    categorySelection,
    syncCategoryCoverage,
    applyCategorySelection,
    chooseCategory,
    radius,
    setRadius,
    activeHour,
    setActiveHour,
    layer,
    setLayer,
    analysisScope,
    setAnalysisScope,
    analysisTopic,
    chooseTopic,
    boundaryVisible,
    setBoundaryVisible,
    storesVisible,
    setStoresVisible,
    period,
    setPeriod,
    resetSelection: () => {
      chooseCategory("카페");
      setRadius(300);
      setLayer("density");
      setAnalysisScope("radius");
      setAnalysisTopic("overview");
      setBoundaryVisible(true);
      setStoresVisible(true);
    },
  };
}
