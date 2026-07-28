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

function focusCategoryCode(category: string, categoryCode: string | null | undefined) {
  if (categoryCode?.trim()) return categoryCode;
  if (category.includes("카페") || category.includes("커피")) return "I21201";
  if (category.includes("베이커리") || category.includes("제과") || category.includes("빵"))
    return "I21001";
  if (category.includes("편의점") || category.includes("마트") || category.includes("슈퍼"))
    return "G20405";
  if (category.includes("미용") || category.includes("헤어") || category.includes("네일"))
    return "S20701";
  if (category.includes("의류") || category.includes("패션") || category.includes("신발"))
    return "G20901";
  if (category.includes("학원") || category.includes("교육")) return "P10501";
  if (category.includes("숙박") || category.includes("호텔") || category.includes("모텔"))
    return "I10103";
  if (
    category.includes("체육") ||
    category.includes("헬스") ||
    category.includes("스포츠") ||
    category.includes("요가") ||
    category.includes("필라테스")
  )
    return "S20801";
  if (category.includes("음식") || category.includes("한식") || category.includes("중식"))
    return "I20101";
  return "LOCAL_SERVICE";
}

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
  const selectedFocusStorefront: SelectedStorefront | null =
    viewport.presentationMode === "storefront3d" &&
    !viewport.storefront3dUnavailable &&
    selectedStore
      ? {
          ...(storefronts.selectedStorefront3d ?? {
            id: selectedStore.id ?? `${selectedStore.name}:${selectedStore.longitude}:${selectedStore.latitude}`,
            longitude: selectedStore.longitude,
            latitude: selectedStore.latitude,
            categoryCode: focusCategoryCode(selectedStore.category, selectedStore.categoryCode),
            building: null,
          }),
          categoryCode: focusCategoryCode(selectedStore.category, selectedStore.categoryCode),
          placementMode: "selected-focus",
        }
      : null;

  function selectAndFocusStore(storeName: string) {
    const store = storefronts.visibleStores.find((candidate) => candidate.name === storeName);
    actions.chooseListedStore(storeName);
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
          categoryCoverageReason={storefronts.categoryCoverageReason}
          layer={selection.layer}
          topic={selection.analysisTopic}
          boundaryVisible={selection.boundaryVisible}
          storesVisible={selection.storesVisible}
          visibleStores={storefronts.listedStores}
          selectedStoreName={selectedStore?.name ?? null}
          nearbyState={nearby.state}
          onNearbyRetry={nearby.retry}
          onClose={() => panels.setFiltersOpen(false)}
          onReset={actions.resetAnalysis}
          onMarketChange={actions.chooseMarket}
          onCategoryChange={actions.chooseCategory}
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
            onSelect={actions.chooseSearchResult}
          />
        }
        mapBody={
          <MarketMapCanvas
            market={market}
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
            visibleStores={storefronts.visibleStores}
            onStorefrontUnavailable={() => viewport.setStorefront3dUnavailable(true)}
            flowPeople={storefronts.flowPeople}
            activeHour={selection.activeHour}
            activeDemandLabel={storefronts.activeDemandLabel}
            mapStores={storefronts.mapStores}
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
          />
        }
        market={market}
        presentationMode={viewport.presentationMode}
        onPresentationModeChange={viewport.setPresentationMode}
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
