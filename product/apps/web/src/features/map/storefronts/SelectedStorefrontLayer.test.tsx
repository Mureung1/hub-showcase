import { act, render, waitFor } from "@testing-library/react";
import { useMap } from "react-map-gl/maplibre";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SelectedStorefrontLayer } from "./SelectedStorefrontLayer";
import { storefrontLayerId } from "./storefrontLayerId";

vi.mock("react-map-gl/maplibre", () => ({ useMap: vi.fn() }));
vi.mock("./createStorefrontMapLayer", () => ({
  createStorefrontMapLayer: vi.fn(() => ({
    id: "localtwin-selected-storefront",
    type: "custom",
    renderingMode: "3d",
    setStore: vi.fn(),
  })),
}));

describe("SelectedStorefrontLayer", () => {
  beforeEach(() => vi.clearAllMocks());

  it("waits for a later styledata event when the map style is still loading", async () => {
    let styleLoaded = false;
    const listeners = new Map<string, () => void>();
    const map = {
      getStyle: vi.fn(() => ({ layers: [] })),
      isStyleLoaded: vi.fn(() => styleLoaded),
      on: vi.fn((event: string, listener: () => void) => listeners.set(event, listener)),
      off: vi.fn((event: string) => listeners.delete(event)),
      addLayer: vi.fn(),
      removeLayer: vi.fn(),
      triggerRepaint: vi.fn(),
    };
    vi.mocked(useMap).mockReturnValue({
      current: { getMap: () => map },
    } as unknown as ReturnType<typeof useMap>);

    const onReady = vi.fn();
    render(
      <SelectedStorefrontLayer
        store={{
          id: "store-1",
          longitude: 126.923,
          latitude: 37.562,
          categoryCode: "I21201",
        }}
        onUnavailable={vi.fn()}
        onReady={onReady}
      />,
    );

    expect(map.addLayer).not.toHaveBeenCalled();
    styleLoaded = true;
    act(() => listeners.get("styledata")?.());

    await waitFor(() => expect(map.addLayer).toHaveBeenCalledTimes(1));
    expect(onReady).toHaveBeenCalledWith("store-1");
    expect(map.off).toHaveBeenCalledWith("styledata", expect.any(Function));
    expect(map.off).toHaveBeenCalledWith("idle", expect.any(Function));
  });

  it("gives every replaced building a stable, separate MapLibre custom-layer id", () => {
    expect(storefrontLayerId("store/a")).toBe("localtwin-storefront-store-a");
    expect(storefrontLayerId("store-b")).toBe("localtwin-storefront-store-b");
  });
});
