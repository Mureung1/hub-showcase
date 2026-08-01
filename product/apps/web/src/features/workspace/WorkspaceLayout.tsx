import { MarketFilters } from "../market/MarketFilters";
import { MarketInspector } from "../market/MarketInspector";
import { MarketQuickMetrics } from "../market/MarketQuickMetrics";
import { MarketMapCanvas } from "../map/MarketMapCanvas";
import { MarketMapPanel } from "../map/MarketMapPanel";
import { MarketSearch } from "../search/MarketSearch";
import type { ProductWorkspaceModel } from "./useProductWorkspaceModel";
import type { PanelTextSize } from "./usePanelTextSize";

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
    taxonomy,
    apiReadiness,
  } = model;
  const { market, nearby, marketAnalysis } = marketData;
  const selectedStore = storefronts.storeSelection.selected;

  function selectAndFocusStore(storeKey: string) {
    const selectedKey = selectedStore ? (selectedStore.id ?? selectedStore.name) : null;
    if (selectedStore && (selectedKey === storeKey || selectedStore.name === storeKey)) {
      storefronts.storeSelection.clearSelection();
      return;
    }

    const store = storefronts.visibleStores.find(
      (candidate) => (candidate.id ?? candidate.name) === storeKey || candidate.name === storeKey,
    );
    if (!store) return;
    viewport.setStorefront3dUnavailable(false);
    storefronts.storeSelection.selectListedStore(store.id ?? store.name);
    panels.setInspectorOpen(true);
    viewport.focusCenter([store.longitude, store.latitude], true);
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
          taxonomy={taxonomy}
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
          onTaxonomyCategoryChange={(name, nodeId, capability) => {
            viewport.setStorefront3dUnavailable(false);
            actions.chooseTaxonomyCategory(name, nodeId, capability);
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
            market={market}
            marketKey={selection.marketKey}
            marketId={catalogState.marketIdByKey[selection.marketKey]}
            mapRef={viewport.mapRef}
            onVisibleCenterChange={viewport.updateVisibleCenter}
            onVisibleBoundsChange={viewport.updateVisibleBounds}
            presentationMode={viewport.presentationMode}
            marketTransitionActive={viewport.marketTransitionActive}
            baseBuildingsRendered={viewport.baseBuildingsRendered}
            layer={selection.layer}
            selectedCategoryName={selection.categorySelection.name}
            boundaryVisible={selection.boundaryVisible}
            storesVisible={selection.storesVisible}
            storefrontBuildings3d={storefronts.storefrontBuildings3d}
            onStorefrontUnavailable={() => viewport.setStorefront3dUnavailable(true)}
            flowPeople={storefronts.flowPeople}
            activeHour={selection.activeHour}
            activeDemandLabel={storefronts.activeDemandLabel}
            mapStores={storefronts.mapStores}
            selected={selectedStore}
            score={storefronts.score}
            onSelectStore={selectAndFocusStore}
            onClearSelection={storefronts.storeSelection.clearSelection}
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
