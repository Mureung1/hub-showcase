import { MarketFilters } from "../market/MarketFilters";
import { MarketInspector } from "../market/MarketInspector";
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
          supportedRadii={catalog.radii}
          category={
            selection.categorySelection.coverage === "full"
              ? selection.categorySelection.analysisCategory
              : null
          }
          categorySelection={selection.categorySelection}
          categoryCoverageReason={storefronts.categoryCoverageReason}
          radius={selection.radius}
          layer={selection.layer}
          scope={selection.analysisScope}
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
          onRadiusChange={actions.chooseRadius}
          onCategoryChange={actions.chooseCategory}
          onLayerChange={actions.chooseLayer}
          onScopeChange={actions.chooseScope}
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
            mapMode={viewport.mapMode}
            baseBuildingsVisible={viewport.baseBuildingsVisible}
            baseBuildingsRendered={viewport.baseBuildingsRendered}
            analysisScope={selection.analysisScope}
            circle={storefronts.circle}
            layer={selection.layer}
            boundaryVisible={selection.boundaryVisible}
            storesVisible={selection.storesVisible}
            selectedStorefront3d={storefronts.selectedStorefront3d}
            onStorefrontUnavailable={() => viewport.setStorefront3dUnavailable(true)}
            analysisCenter={viewport.analysisCenter}
            radius={selection.radius}
            flowPeople={storefronts.flowPeople}
            activeHour={selection.activeHour}
            activeDemandLabel={storefronts.activeDemandLabel}
            mapStores={storefronts.mapStores}
            selected={storefronts.storeSelection.selected}
            score={storefronts.score}
            prefabMode={viewport.prefabMode}
            onSelectStore={actions.chooseListedStore}
            visibleSupportedRegion={viewport.visibleSupportedRegion !== undefined}
            analysisMoveMode={viewport.analysisMoveMode}
            canConfirmAnalysisMove={viewport.draftSupportedRegion !== undefined}
            onStartAnalysisMove={viewport.startMove}
            onConfirmAnalysisMove={actions.confirmAnalysisMove}
            onCancelAnalysisMove={viewport.cancelMove}
            onEvidenceOpen={() => panels.setEvidenceOpen(true)}
          />
        }
        market={market}
        mapMode={viewport.mapMode}
        onMapModeChange={viewport.setMapMode}
        layer={selection.layer}
        onLayerChange={actions.chooseLayer}
        densityLabel={storefronts.densityLabel}
        activeDemandLabel={storefronts.activeDemandLabel}
        activeDemand={storefronts.activeDemand}
        baseBuildingsVisible={viewport.baseBuildingsVisible}
        onBaseBuildingsVisibleChange={viewport.setBaseBuildingsVisible}
        mapRef={viewport.mapRef}
        prefabMode={viewport.prefabMode}
        onPrefabToggle={actions.togglePrefabMode}
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
          radius={selection.radius}
          activeHour={selection.activeHour}
          sameCategoryCount={storefronts.sameCategoryCount}
          analysis={marketAnalysis.analysis}
          background={marketAnalysis.background}
          backgroundState={marketAnalysis.backgroundState}
          analysisState={marketAnalysis.analysisState}
          analysisScope={selection.analysisScope}
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
