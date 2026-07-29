import { useMemo } from "react";

import { categoryMatchesSelection } from "../market/categorySelection";
import { categoryFocusCode } from "../market/categorySemantics";
import { MarketFilters } from "../market/MarketFilters";
import { MarketInspector } from "../market/MarketInspector";
import { MarketQuickMetrics } from "../market/MarketQuickMetrics";
import { MarketMapCanvas } from "../map/MarketMapCanvas";
import { MarketMapPanel } from "../map/MarketMapPanel";
import type { SelectedStorefront } from "../map/storefronts/SelectedStorefrontLayer";
import { MarketSearch } from "../search/MarketSearch";
import type { ProductWorkspaceModel } from "./useProductWorkspaceModel";
import type { PanelTextSize } from "./usePanelTextSize";
import { useWorkspaceUrlPersistence } from "./useWorkspaceUrlPersistence";

export function WorkspaceLayout({
  model,
  catalogDisplayState,
  onCatalogRetry,
  panelTextSize,
}: {
  model: ProductWorkspaceModel;
  catalogDisplayState: "ranked" | "connecting" | "bootstrap" | "error";
  onCatalogRetry: () => void;
  panelTextSize: PanelTextSize;
}) {
  const {
    catalog,
    catalogState,
    selection,
    panels,
    viewport,
    marketData,
    storefronts,
    actions,
    apiReadiness,
  } = model;
  const { market, nearby, marketAnalysis } = marketData;
  useWorkspaceUrlPersistence(model);

  const selectedStore = storefronts.storeSelection.selected;
  const selectedCategoryStores = useMemo(
    () =>
      storefronts.visibleStores.filter((store) =>
        categoryMatchesSelection(store.category, selection.categorySelection),
      ),
    [selection.categorySelection, storefronts.visibleStores],
  );
  const selectedFocusStorefront = useMemo<SelectedStorefront | null>(
    () =>
      viewport.presentationMode === "storefront3d" &&
      !viewport.storefront3dUnavailable &&
      selectedStore
        ? {
            id:
              selectedStore.id ??
              `${selectedStore.name}:${selectedStore.longitude}:${selectedStore.latitude}`,
            longitude: selectedStore.longitude,
            latitude: selectedStore.latitude,
            categoryCode: categoryFocusCode(selectedStore.category, selectedStore.categoryCode),
            placementMode: "selected-focus",
            building: null,
          }
        : null,
    [selectedStore, viewport.presentationMode, viewport.storefront3dUnavailable],
  );

  function selectAndFocusStore(storeKey: string) {
    const store = storefronts.visibleStores.find(
      (candidate) => (candidate.id ?? candidate.name) === storeKey,
    );
    viewport.setStorefront3dUnavailable(false);
    actions.chooseListedStore(storeKey);
    if (store) viewport.focusCenter([store.longitude, store.latitude], true);
  }

  return (
    <section
      id="analysis"
      className={`analysis-layout ${panels.filtersOpen ? "" : "is-filter-closed"} ${panels.inspectorOpen ? "" : "is-inspector-closed"}`}
      data-panel-text-size={panelTextSize}
      aria-label="상권 분석 작업 공간"
    >
      {panels.filtersOpen && (
        <MarketFilters
          marketKey={selection.marketKey}
          markets={catalogState.markets}
          supportedCategories={catalog.categories}
          catalogState={catalogDisplayState}
          onCatalogRetry={onCatalogRetry}
          category={selection.categorySelection.name}
          categorySelection={selection.categorySelection}
          layer={selection.layer}
          topic={selection.analysisTopic}
          boundaryVisible={selection.boundaryVisible}
          storesVisible={selection.storesVisible}
          visibleStores={storefronts.listedStores}
          selectedStoreName={selectedStore?.name ?? null}
          sameCategoryCount={storefronts.sameCategoryCount}
          nearbyState={nearby.state}
          onNearbyRetry={nearby.retry}
          onClose={() => panels.setFiltersOpen(false)}
          onReset={actions.resetAnalysis}
          onMarketChange={(nextMarket) => {
            viewport.setStorefront3dUnavailable(false);
            actions.chooseMarket(nextMarket);
          }}
          onCategoryChange={(nextCategory) => {
            viewport.setStorefront3dUnavailable(false);
            actions.chooseCategory(nextCategory);
          }}
          onLayerChange={actions.chooseLayer}
          onTopicChange={(topic) => {
            selection.chooseTopic(topic);
          }}
          onBoundaryVisibleChange={(visible) => {
            selection.setBoundaryVisible(visible);
          }}
          onStoresVisibleChange={(visible) => {
            selection.setStoresVisible(visible);
          }}
          onStoreChange={selectAndFocusStore}
        />
      )}
      <MarketMapPanel
        toolbarStart={
          <MarketSearch
            apiReady={apiReadiness.state === "ready"}
            onSelect={(result) => {
              viewport.setStorefront3dUnavailable(false);
              actions.chooseSearchResult(result);
            }}
          />
        }
        mapBody={
          <MarketMapCanvas
            key={catalogState.marketIdByKey[selection.marketKey]}
            market={market}
            marketKey={selection.marketKey}
            marketId={catalogState.marketIdByKey[selection.marketKey]}
            mapRef={viewport.mapRef}
            onVisibleCenterChange={viewport.updateVisibleCenter}
            onVisibleBoundsChange={viewport.updateVisibleBounds}
            presentationMode={viewport.presentationMode}
            baseBuildingsRendered={viewport.baseBuildingsRendered}
            layer={selection.layer}
            selectedCategoryName={selection.categorySelection.name}
            boundaryVisible={selection.boundaryVisible}
            storesVisible={selection.storesVisible}
            storefrontBuildings3d={selectedFocusStorefront ? [selectedFocusStorefront] : []}
            onStorefrontUnavailable={() => viewport.setStorefront3dUnavailable(true)}
            flowPeople={storefronts.flowPeople}
            activeHour={selection.activeHour}
            activeDemandLabel={storefronts.activeDemandLabel}
            mapStores={selectedCategoryStores}
            selected={selectedStore}
            score={storefronts.score}
            sameCategoryCount={storefronts.sameCategoryCount}
            onSelectStore={selectAndFocusStore}
            visibleSupportedRegion={viewport.visibleSupportedRegion !== undefined}
            onEvidenceOpen={() => panels.setEvidenceOpen(true)}
          />
        }
        bottomMetrics={
          <MarketQuickMetrics
            market={market}
            categorySelection={selection.categorySelection}
            analysis={marketAnalysis.analysis}
            analysisState={marketAnalysis.analysisState}
            sameCategoryCount={
              nearby.state === "ready" || nearby.state === "empty"
                ? storefronts.sameCategoryCount
                : null
            }
          />
        }
        market={market}
        presentationMode={viewport.presentationMode}
        onPresentationModeChange={(mode) => {
          if (mode === "storefront3d") viewport.setStorefront3dUnavailable(false);
          viewport.setPresentationMode(mode);
        }}
        layer={selection.layer}
        onLayerChange={actions.chooseLayer}
        densityLabel={storefronts.densityLabel}
        activeDemandLabel={storefronts.activeDemandLabel}
        activeDemand={storefronts.activeDemand}
        flowState={marketAnalysis.flowState}
        mapRef={viewport.mapRef}
        onCompareOpen={() => panels.setCompareOpen(true)}
        comparisonEnabled={selection.categorySelection.coverage === "full"}
        filtersOpen={panels.filtersOpen}
        inspectorOpen={panels.inspectorOpen}
        filterOpenButtonRef={panels.filterOpenButtonRef}
        inspectorOpenButtonRef={panels.inspectorOpenButtonRef}
        onFiltersOpen={() => panels.setFiltersOpen(true)}
        onInspectorOpen={() => panels.setInspectorOpen(true)}
      />
      {panels.inspectorOpen && (
        <MarketInspector
          market={market}
          selected={selectedStore}
          score={storefronts.score}
          categorySelection={selection.categorySelection}
          categoryCoverageReason={storefronts.categoryCoverageReason}
          activeHour={selection.activeHour}
          sameCategoryCount={storefronts.sameCategoryCount}
          analysis={marketAnalysis.analysis}
          storeTrend={marketAnalysis.storeTrend}
          storeTrendState={marketAnalysis.storeTrendState}
          background={marketAnalysis.background}
          backgroundState={marketAnalysis.backgroundState}
          analysisState={marketAnalysis.analysisState}
          flowState={marketAnalysis.flowState}
          analysisScope="market"
          topic={selection.analysisTopic}
          onAnalysisRetry={marketAnalysis.retryAnalysis}
          onClosePanel={() => panels.setInspectorOpen(false)}
          onClearSelection={storefronts.storeSelection.clearSelection}
          onEvidenceOpen={() => panels.setEvidenceOpen(true)}
          onReportOpen={() => panels.setReportOpen(true)}
          onActiveHourChange={selection.setActiveHour}
        />
      )}
    </section>
  );
}
