import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./features/market/useProductCatalog", () => ({
  useProductCatalog: () => ({
    state: "ready",
    remoteState: "ready",
    retry: vi.fn(),
    catalog: {
      markets: [
        {
          key: "연남",
          market_id: "3110562",
          name: "연남동 골목상권",
          address: "마포구 동교로 38길 일대",
          center: [126.922787722224, 37.5634957461626],
        },
        {
          key: "홍대",
          market_id: "3120103",
          name: "홍대입구역 상권",
          address: "마포구 양화로 일대",
          center: [126.919317433833, 37.5527848842777],
        },
        {
          key: "합정",
          market_id: "3120101",
          name: "합정역 상권",
          address: "마포구 양화로 45 일대",
          center: [126.91324192136, 37.5492309987762],
        },
      ],
      categories: [
        { name: "카페", codes: ["CS100010"] },
        { name: "음식점", codes: ["CS100001"] },
        { name: "베이커리", codes: ["CS100005"] },
        { name: "편의점", codes: ["CS300002"] },
        { name: "의류", codes: ["CS300021"] },
      ],
      radii: [100, 300, 500],
      ranking_basis: "supported_market_unique_store_count",
    },
  }),
}));

vi.mock("./features/system/useApiReadiness", () => ({
  useApiReadiness: () => ({ state: "ready", retry: vi.fn() }),
}));

vi.mock("./components/SplatViewer", () => ({
  SplatViewer: ({ assetUrl }: { assetUrl: string }) => (
    <div aria-label="Gaussian Splat 3D 장면" data-asset-url={assetUrl} />
  ),
}));

import { App } from "./App";
import { ANALYSIS_SESSION_STORAGE_KEY } from "./features/analysis/analysisSessionState";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.sessionStorage.clear();
  window.history.replaceState({}, "", "/");
});

describe("App", () => {
  it("renders the analysis shell without presenting a score before the API responds", () => {
    render(<App />);

    expect(screen.getByRole("link", { name: "LocalTwin 상권 분석 홈" })).toHaveAttribute(
      "href",
      "/home",
    );
    expect(screen.getByRole("link", { name: "Docs" })).toHaveAttribute(
      "href",
      "https://hub-localtwin-docs-vercel.vercel.app/docs/wiki/doc-viewer.html?doc=Home.md",
    );
    expect(screen.getByRole("region", { name: "상권 분석 작업 공간" })).toBeInTheDocument();
    expect(screen.getByRole("toolbar", { name: "분석 도구" })).toBeInTheDocument();
    expect(screen.queryByText("입지 점수")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "전체 상권 보기" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "상권 통계 분기" })).toHaveValue("");
    expect(screen.getByRole("option", { name: "분기 확인 중" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "H" })).not.toBeInTheDocument();
    expect(screen.getByText("서울시 공식 상권 경계로 집계")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "상권 경계" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "3DGS 실험 열기" })).toBeInTheDocument();
    expect(screen.getByText("서울 상권분석 공식 분기 자료를 불러오는 중입니다.")).toBeInTheDocument();
  });

  it("starts without an implicit store selection and leaves the product URL unchanged", () => {
    render(<App />);

    expect(document.querySelector(".selected-location")).not.toBeInTheDocument();
    expect(screen.getByText("카페 · 상권 분석")).toBeInTheDocument();

    expect(window.location.pathname).toBe("/");
    expect(window.location.search).toBe("");
  });

  it("closes evidence with Escape and returns focus to its trigger", async () => {
    render(<App />);
    const trigger = screen.getByRole("button", { name: "데이터 도움말" });
    trigger.focus();
    fireEvent.click(trigger);

    expect(await screen.findByRole("dialog", { name: "데이터 산정 근거" })).toBeInTheDocument();
    expect(screen.getByLabelText("데이터 산정 근거 내용")).toHaveAttribute("tabindex", "0");
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "데이터 산정 근거 닫기" })).toHaveFocus(),
    );
    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("dialog", { name: "데이터 산정 근거" })).not.toBeInTheDocument();
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it("opens the Korean report dialog instead of starting a print flow", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "보고서" }));
    expect(screen.getByRole("dialog", { name: "상권 분석 보고서" })).toBeInTheDocument();
  });

  it("starts mobile in a map-first state and keeps Docs available", () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockReturnValue({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    );

    render(<App />);

    expect(screen.queryByLabelText("상권 선택")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "상권 분석" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "분석 결과 닫기" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "분석 설정 패널 열기" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "분석 결과 패널 열기" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Docs" })).toBeInTheDocument();
  });

  it("keeps market-bound analysis and separates topic and map display controls", () => {
    render(<App />);

    expect(screen.queryByRole("button", { name: "직접 선택" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "300m" })).not.toBeInTheDocument();

    fireEvent.click(within(document.querySelector(".topic-grid")!).getByRole("button", { name: "유동인구" }));
    expect(screen.getByText("유동인구", { selector: ".inspector-topic" })).toBeInTheDocument();
    expect(within(document.querySelector(".layer-filter")!).getByRole("button", { name: "유동인구" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    fireEvent.click(within(document.querySelector(".layer-filter")!).getByRole("button", { name: /점포 위치/ }));
    expect(within(document.querySelector(".layer-filter")!).getByRole("button", { name: /점포 위치/ })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(screen.getByRole("button", { name: /인구 밀도/ })).toBeDisabled();
  });

  it("closes and reopens both panels without creating a fixture store selection", () => {
    render(<App />);

    expect(document.querySelector(".selected-location")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "분석 결과 닫기" }));
    const inspectorOpen = screen.getByRole("button", { name: "분석 결과 패널 열기" });
    expect(inspectorOpen).toHaveFocus();

    fireEvent.click(inspectorOpen);
    expect(screen.getByText("카페 · 상권 분석")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "분석 조건 닫기" }));
    const filtersOpen = screen.getByRole("button", { name: "분석 설정 패널 열기" });
    expect(filtersOpen).toHaveFocus();
    fireEvent.click(filtersOpen);
    expect(screen.getByLabelText("상권 선택")).toBeInTheDocument();
  });

  it("shows five matching nearby stores first and expands the complete list", async () => {
    const stores = Array.from({ length: 7 }, (_, index) => ({
      id: `CAFE-${index + 1}`,
      name: `테스트 카페 ${index + 1}`,
      address: `서울 마포구 테스트로 ${index + 1}`,
      category_code: "I21201",
      category_name: "카페",
      distance_meters: 20 + index,
      latitude: 37.5635,
      longitude: 126.9228,
      source_snapshot_id: "snapshot-1",
    }));
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async (input: string) => {
        if (input.includes("/api/v1/stores/nearby")) {
          return {
            ok: true,
            json: async () => ({
              center: { longitude: 126.9228, latitude: 37.5635 },
              radius: 300,
              market_id: "3110562",
              market_name: "연트럴파크",
              total_count: 7,
              same_category_count: 7,
              category_counts: { 카페: 7 },
              returned_count: 7,
              truncated: false,
              stores,
              evidence: [],
              category_coverage: {
                status: "full",
                requested_category: "카페",
                analysis_category: "카페",
                available_metrics: ["store_points", "competition"],
                unavailable_metrics: [],
                reason: "선택 업종은 현재 상권 분석 지표를 모두 지원합니다.",
              },
              aggregation_scope: "market",
            }),
          };
        }
        return { ok: false, status: 503, json: async () => ({}) };
      }),
    );

    render(<App />);

    expect(await screen.findByText("7개 중 5개 표시")).toBeInTheDocument();
    expect(document.querySelectorAll(".store-row")).toHaveLength(5);
    fireEvent.click(screen.getByRole("button", { name: "7개 전체보기" }));
    await waitFor(() => expect(screen.getByText("7개 중 7개 표시")).toBeInTheDocument());
    expect(document.querySelectorAll(".store-row")).toHaveLength(7);
    expect(screen.getByRole("button", { name: "목록 접기" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });

  it("restores the same-tab analysis filters from session storage while keeping the URL clean", () => {
    window.sessionStorage.setItem(
      ANALYSIS_SESSION_STORAGE_KEY,
      JSON.stringify({
        marketKey: "합정",
        selectedCategoryName: "음식점",
        selectedCategoryCode: null,
        radius: 300,
        activeHour: 4,
        layer: "density",
        topic: "competition",
        boundaryVisible: true,
        storesVisible: true,
        period: "20254",
      }),
    );

    render(<App />);

    expect(screen.getByRole("button", { name: "상권 선택: 합정" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "음식점" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "경쟁 현황" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(window.location.search).toBe("");
  });

  it("trusts the API category result instead of filtering detailed store names again", async () => {
    const stores = [
      ["FOOD-1", "돼지고기집", "I20107", "돼지고기 구이/찜"],
      ["FOOD-2", "동네 중국집", "I20201", "중국집"],
      ["FOOD-3", "생맥주집", "I21104", "생맥주 전문"],
    ].map(([id, name, categoryCode, categoryName], index) => ({
      id,
      name,
      address: `서울 마포구 합정로 ${index + 1}`,
      category_code: categoryCode,
      category_name: categoryName,
      distance_meters: 30 + index,
      latitude: 37.5492,
      longitude: 126.9132,
      source_snapshot_id: "snapshot-food",
    }));
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async (input: string) => {
        if (input.includes("/api/v1/stores/nearby")) {
          return {
            ok: true,
            json: async () => ({
              center: { longitude: 126.9132, latitude: 37.5492 },
              radius: 300,
              market_id: "3120101",
              market_name: "합정역 상권",
              total_count: 3,
              same_category_count: 3,
              category_counts: { 음식점: 3 },
              returned_count: 3,
              truncated: false,
              stores,
              evidence: [],
              category_coverage: {
                status: "full",
                requested_category: "음식점",
                analysis_category: "음식점",
                available_metrics: ["store_points", "competition"],
                unavailable_metrics: [],
                reason: "선택 업종은 현재 상권 분석 지표를 모두 지원합니다.",
              },
              aggregation_scope: "market",
            }),
          };
        }
        return { ok: false, status: 503, json: async () => ({}) };
      }),
    );

    render(<App />);
    fireEvent.change(screen.getByLabelText("상권 선택"), { target: { value: "합정" } });
    fireEvent.click(screen.getByRole("button", { name: "음식점" }));

    expect(await screen.findByText("상권 내 음식점")).toBeInTheDocument();
    expect(screen.getByText("3개 중 3개 표시")).toBeInTheDocument();
    expect(document.querySelectorAll(".store-row")).toHaveLength(3);
    expect(screen.getByText("돼지고기집")).toBeInTheDocument();
    expect(screen.getByText("동네 중국집")).toBeInTheDocument();
    expect(screen.getByText("생맥주집")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /돼지고기집/ }));

    expect(document.querySelectorAll(".store-row")).toHaveLength(3);
    expect(document.querySelectorAll(".store-row.is-selected")).toHaveLength(1);
    expect(screen.getByText("3개 중 3개 표시")).toBeInTheDocument();
  });

  it("keeps the selected top category when an API-filtered store has a detailed name", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async (input: string) => {
        if (input.includes("/api/v1/stores/nearby")) {
          return {
            ok: true,
            json: async () => ({
              center: { longitude: 126.9228, latitude: 37.5635 },
              radius: 300,
              market_id: "3110562",
              market_name: "연남동 골목상권",
              total_count: 1,
              same_category_count: 1,
              category_counts: { 의류: 1 },
              returned_count: 1,
              truncated: false,
              stores: [
                {
                  id: "APPAREL-1",
                  name: "연남 가방점",
                  address: "서울 마포구 연남로 1",
                  category_code: "G20911",
                  category_name: "가방 소매업",
                  distance_meters: 25,
                  latitude: 37.5635,
                  longitude: 126.9228,
                  source_snapshot_id: "snapshot-apparel",
                },
              ],
              evidence: [],
              category_coverage: {
                status: "partial",
                requested_category: "의류",
                analysis_category: null,
                available_metrics: ["store_points", "competition"],
                unavailable_metrics: ["market_stores", "sales", "flow", "score"],
                reason: "해당 세부 업종은 점포 위치와 상권 경쟁 지표만 제공합니다.",
              },
              aggregation_scope: "market",
            }),
          };
        }
        return { ok: false, status: 503, json: async () => ({}) };
      }),
    );

    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "의류" }));
    fireEvent.click(await screen.findByRole("button", { name: /연남 가방점/ }));

    await waitFor(() => {
      expect(window.location.search).toBe("");
    });
    expect(screen.getByText("상권 내 의류")).toBeInTheDocument();
    expect(screen.getByText("1개 중 1개 표시")).toBeInTheDocument();
    expect(document.querySelectorAll(".store-row.is-selected")).toHaveLength(1);
  });

  it("updates analysis conditions and opens the comparison dialog", () => {
    render(<App />);

    fireEvent.change(screen.getByLabelText("상권 선택"), { target: { value: "합정" } });
    fireEvent.click(screen.getByRole("button", { name: "음식점" }));
    expect(document.querySelector(".selected-location")).not.toBeInTheDocument();

    expect(screen.getByText("서울시 공식 상권 경계로 집계")).toBeInTheDocument();

    const mapLayers = within(document.querySelector(".layer-filter")!);
    fireEvent.click(mapLayers.getByRole("button", { name: "유동인구" }));
    expect(mapLayers.getByRole("button", { name: "유동인구" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByText("시간대 유동 수요")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "전체 상권 보기" }));
    expect(screen.getByRole("dialog", { name: "상권 비교" })).toBeInTheDocument();
  });

  it("switches between the map presentation modes", () => {
    render(<App />);

    const analysisMode = screen.getByRole("button", { name: "카페 점포 밀도" });
    const flatMode = screen.getByRole("button", { name: "실제 지도" });
    const storefront3dMode = screen.getByRole("button", { name: "3D 점포" });

    expect(analysisMode).toHaveAttribute("aria-pressed", "true");
    expect(flatMode).toHaveAttribute("aria-pressed", "false");
    expect(storefront3dMode).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText("OpenFreeMap · LocalTwin")).toBeInTheDocument();

    fireEvent.click(flatMode);
    expect(analysisMode).toHaveAttribute("aria-pressed", "false");
    expect(flatMode).toHaveAttribute("aria-pressed", "true");
    expect(storefront3dMode).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText("OpenFreeMap")).toBeInTheDocument();

    fireEvent.click(storefront3dMode);
    expect(analysisMode).toHaveAttribute("aria-pressed", "false");
    expect(flatMode).toHaveAttribute("aria-pressed", "false");
    expect(storefront3dMode).toHaveAttribute("aria-pressed", "true");
  });

  it("opens the 3DGS experiment on a clearly labeled sample before showing creation tools", async () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "3DGS 실험 열기" }));

    expect(await screen.findByRole("dialog", { name: "3DGS 실험실" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "샘플 결과 보기" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("tab", { name: "새 장면 만들기" })).toBeInTheDocument();
    expect(screen.getByLabelText("Gaussian Splat 3D 장면")).toHaveAttribute(
      "data-asset-url",
      "https://sparkjs.dev/assets/splats/butterfly.spz",
    );
    expect(
      screen.getByText("Spark 공식 SPZ 샘플 · LocalTwin 촬영 결과가 아닙니다."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("product/data/scenes/jobs/<job-id>/asset/scene.ply"),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "자동 변환 시작" })).not.toBeInTheDocument();
  });

  it("connects a real search result to the map and analysis selection", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          query: "테스트 카페",
          results: [
            {
              result_type: "store",
              id: "S1",
              name: "연남 테스트 카페",
              address: "서울 마포구 동교로 1",
              category_code: "I21201",
              category_name: "카페",
              longitude: 126.926,
              latitude: 37.566,
              market_id: "3110562",
              market_name: "연트럴파크",
            },
          ],
        }),
      }),
    );
    render(<App />);

    fireEvent.change(screen.getByLabelText("상권 또는 점포 검색"), {
      target: { value: "테스트 카페" },
    });
    fireEvent.click(screen.getByRole("button", { name: "검색" }));
    fireEvent.click(await screen.findByRole("button", { name: /연남 테스트 카페/ }));

    expect(screen.getAllByText("연남 테스트 카페").length).toBeGreaterThan(0);
    expect(screen.getByText("카페 · 서울 마포구 동교로 1")).toBeInTheDocument();
    expect(screen.queryByText(/분석 지표는 현재 지원 업종인/)).not.toBeInTheDocument();
    expect(document.querySelector("main")).toHaveAttribute("data-storefront-3d-state", "idle");

    fireEvent.click(screen.getByRole("button", { name: "3D 점포" }));

    await waitFor(() =>
      expect(document.querySelector("main")).toHaveAttribute(
        "data-storefront-3d-state",
        "selected",
      ),
    );
  });

  it("keeps a detailed store category and never substitutes cafe analysis", async () => {
    const fetchMock = vi.fn().mockImplementation(async (input: string) => {
      if (input.includes("/api/v1/search")) {
        return {
          ok: true,
          json: async () => ({
            query: "꽃집",
            results: [
              {
                result_type: "store",
                id: "FLOWER-1",
                name: "연남 꽃 작업실",
                address: "서울 마포구 연남로 1",
                category_code: "G21501",
                category_name: "꽃집",
                longitude: 126.926,
                latitude: 37.566,
                market_id: "3110562",
                market_name: "연트럴파크",
              },
            ],
          }),
        };
      }
      const isFlowerRequest = input.includes(encodeURIComponent("꽃집"));
      return {
        ok: true,
        json: async () => ({
          center: { longitude: 126.926, latitude: 37.566 },
          radius: 300,
          market_id: "3110562",
          market_name: "연트럴파크",
          total_count: isFlowerRequest ? 1 : 0,
          same_category_count: isFlowerRequest ? 1 : 0,
          category_counts: isFlowerRequest ? { 꽃집: 1 } : {},
          returned_count: 0,
          truncated: false,
          stores: [],
          evidence: [],
          category_coverage: {
            status: isFlowerRequest ? "partial" : "unavailable",
            requested_category: isFlowerRequest ? "꽃집" : "카페",
            analysis_category: null,
            available_metrics: isFlowerRequest ? ["store_points", "competition"] : [],
            unavailable_metrics: ["sales", "flow", "score"],
            reason: isFlowerRequest
              ? "해당 세부 업종은 점포 위치와 상권 경쟁 지표만 제공합니다."
              : "분석 근거 없음",
          },
          aggregation_scope: "market",
        }),
      };
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<App />);

    fireEvent.change(screen.getByLabelText("상권 또는 점포 검색"), {
      target: { value: "꽃집" },
    });
    fireEvent.click(screen.getByRole("button", { name: "검색" }));
    fireEvent.click(await screen.findByRole("button", { name: /연남 꽃 작업실/ }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining(`category=${encodeURIComponent("꽃집")}`),
        expect.any(Object),
      ),
    );
    expect(screen.getAllByText("꽃집").length).toBeGreaterThan(0);
    expect((await screen.findAllByText("점포 위치·경쟁만 제공")).length).toBeGreaterThan(0);
    expect(screen.queryByText("입지 점수")).not.toBeInTheDocument();
    expect(screen.queryByText(/카페 기준/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "전체 상권 보기" })).toBeDisabled();
    expect(window.location.search).toBe("");

    expect(document.querySelector(".selected-location")).not.toBeInTheDocument();
    expect(document.querySelector("main")).toHaveAttribute("data-storefront-3d-state", "idle");
  });
});
