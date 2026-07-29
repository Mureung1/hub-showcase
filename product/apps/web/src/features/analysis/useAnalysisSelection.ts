import { useCallback, useState } from "react";

import {
  quickCategorySelection,
  topCategorySelectionForStore,
} from "../market/categorySelection";
import type { AnalysisTopic, Category, CategorySelection } from "../market/types";
import type { AnalysisUrlState } from "./analysisUrlState";
import type { NearbyStoreResponse } from "./types";

export function useAnalysisSelection(initial: AnalysisUrlState) {
  const initialCategorySelection = topCategorySelectionForStore(
    initial.selectedCategoryName,
    initial.selectedCategoryCode,
  );
  const [marketKey, setMarketKey] = useState(initial.marketKey);
  const [category, setCategory] = useState<Category>(initialCategorySelection.name);
  const [categorySelection, setCategorySelection] =
    useState<CategorySelection>(initialCategorySelection);
  const [radius, setRadius] = useState(initial.radius);
  const [activeHour, setActiveHour] = useState(initial.activeHour ?? 2);
  const [layer, setLayer] = useState(initial.layer);
  const analysisScope = "market" as const;
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
    setCategory(next.name);
    if (next.coverage !== "full") {
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
      setActiveHour(2);
      setLayer("density");
      setAnalysisTopic("overview");
      setBoundaryVisible(true);
      setStoresVisible(true);
    },
  };
}
