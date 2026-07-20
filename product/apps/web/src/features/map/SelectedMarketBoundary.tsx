import { Layer, Source } from "react-map-gl/maplibre";

import { marketBoundaryFilter } from "./marketBoundary";

const BOUNDARY_SOURCE_ID = "localtwin-selected-market-boundary";

type SelectedMarketBoundaryProps = {
  marketId: string;
};

export function SelectedMarketBoundary({ marketId }: SelectedMarketBoundaryProps) {
  const filter = marketBoundaryFilter(marketId);

  return (
    <Source id={BOUNDARY_SOURCE_ID} type="geojson" data="/data/market-boundaries.geojson">
      <Layer
        id="localtwin-selected-market-boundary-fill"
        type="fill"
        filter={filter}
        paint={{
          "fill-color": "#ffeb00",
          "fill-opacity": 0.025,
        }}
      />
      <Layer
        id="localtwin-selected-market-boundary-halo"
        type="line"
        filter={filter}
        layout={{ "line-cap": "round", "line-join": "round" }}
        paint={{
          "line-color": "#ffd400",
          "line-width": 18,
          "line-opacity": 0.3,
          "line-blur": 10,
        }}
      />
      <Layer
        id="localtwin-selected-market-boundary-glow"
        type="line"
        filter={filter}
        layout={{ "line-cap": "round", "line-join": "round" }}
        paint={{
          "line-color": "#ffea00",
          "line-width": 8,
          "line-opacity": 0.66,
          "line-blur": 3.5,
        }}
      />
      <Layer
        id="localtwin-selected-market-boundary-core"
        type="line"
        filter={filter}
        layout={{ "line-cap": "round", "line-join": "round" }}
        paint={{
          "line-color": "#fff7a8",
          "line-width": 2.6,
          "line-opacity": 0.96,
        }}
      />
    </Source>
  );
}
