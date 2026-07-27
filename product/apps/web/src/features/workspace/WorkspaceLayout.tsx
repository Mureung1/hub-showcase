import { MarketFilters } from "../market/MarketFilters";
import { MarketInspector } from "../market/MarketInspector";
import { MarketQuickMetrics } from "../market/MarketQuickMetrics";
import { MarketMapCanvas } from "../map/MarketMapCanvas";
import { MarketMapPanel } from "../map/MarketMapPanel";
import { MarketSearch } from "../search/MarketSearch";
import type { ProductWorkspaceModel } from "./useProductWorkspaceModel";

export function WorkspaceLayout({ model }: { model: ProductWorkspaceModel }) {
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

  return (
    <section
      id="analysis"
      className={`analysis-layout ${panels.filtersOpen ? "" : "is-filter-closed"} ${panels.inspectorOpen ? "" : "is-inspector-closed"}`}
      aria-label="상권 분석 작업 공간"
    >
      {panels.filtersOpen && (
        <MarketFilters
          marketKey={selection.marketKey}
          markets={catalogState.markets}
          supportedCategories={catalog.categories.map((item) => item.name)}
          category={
            selection.categorySelection.coverage === "full"
              ? selection.categorySelection.analysisCategory
              : null
          }
          categorySelection={selection.categorySelection}
          categoryCoverageReason={storefronts.categoryCoverageReason}
          layer={selection.layer}
          topic={selection.analysisTopic}
          boundaryVisible={selection.boundaryVisible}
          storesVisible={selection.storesVisible}
          visibleStores={storefronts.listedStores}
          selectedStoreName={storefronts.storeSelection.selected?.name ?? null}
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
          onStoreChange={actions.chooseListedStore}
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
            boundaryVisible={selection.boundaryVisible}
            storesVisible={selection.storesVisible}
            storefrontBuildings3d={storefronts.storefrontBuildings3d}
            onStorefrontUnavailable={() => viewport.setStorefront3dUnavailable(true)}
            flowPeople={storefronts.flowPeople}
            activeHour={selection.activeHour}
            activeDemandLabel={storefronts.activeDemandLabel}
            mapStores={storefronts.mapStores}
            selected={storefronts.storeSelection.selected}
            score={storefronts.score}
            sameCategoryCount={storefronts.sameCategoryCount}
            onSelectStore={actions.chooseListedStore}
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
          selected={storefronts.storeSelection.selected}
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
