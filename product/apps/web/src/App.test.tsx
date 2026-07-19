import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./features/market/useProductCatalog", () => ({
  useProductCatalog: () => ({
    state: "ready",
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
      ],
      radii: [100, 300, 500],
    },
  }),
}));

import { App } from "./App";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.history.replaceState({}, "", "/");
});

describe("App", () => {
  it("renders the analysis shell without presenting a score before the API responds", () => {
    render(<App />);

    expect(screen.getByRole("link", { name: "LocalTwin 상권 분석 홈" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Docs" })).toHaveAttribute(
      "href",
      "https://hub-localtwin-docs-vercel.vercel.app/docs/wiki/doc-viewer.html?doc=Home.md",
    );
    expect(screen.getByRole("region", { name: "상권 분석 작업 공간" })).toBeInTheDocument();
    expect(screen.queryByText("입지 점수")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "상권 비교 열기" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "분석 데이터 분기" })).toHaveValue("");
    expect(screen.getByRole("option", { name: "분기 확인 중" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "H" })).not.toBeInTheDocument();
    expect(screen.getByRole("group", { name: "분석 기준" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "상권 경계" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: /관평동 3D 장소/ })).toBeInTheDocument();
    expect(screen.getByText("서울 상권분석 공식 데이터를 불러오는 중입니다.")).toBeInTheDocument();
  });

  it("starts without an implicit store selection or a generated query string", () => {
    render(<App />);

    expect(document.querySelector(".selected-location")).not.toBeInTheDocument();
    expect(screen.getByText("카페 · 상권 분석")).toBeInTheDocument();
    expect(window.location.search).toBe("");
  });

  it("closes evidence with Escape and returns focus to its trigger", async () => {
    render(<App />);
    const trigger = screen.getByRole("button", { name: "데이터 도움말" });
    trigger.focus();
    fireEvent.click(trigger);

    expect(await screen.findByRole("dialog", { name: "데이터 산정 근거" })).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "데이터 산정 근거 닫기" })).toHaveFocus(),
    );
    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("dialog", { name: "데이터 산정 근거" })).not.toBeInTheDocument();
    await waitFor(() => expect(trigger).toHaveFocus());
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
    expect(screen.queryByRole("button", { name: "분석 결과 닫기" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "분석 조건 열기" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "분석 결과 열기" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Docs" })).toBeInTheDocument();
  });

  it("separates analysis scope, topic, and map display controls", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "상권" }));
    expect(screen.getByRole("button", { name: "상권" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "300m" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "유동인구" }));
    expect(screen.getByText("유동인구", { selector: ".inspector-topic" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "시간대 수요" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    fireEvent.click(screen.getByRole("button", { name: "점포 위치" }));
    expect(screen.getByRole("button", { name: "점포 위치" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(screen.getByRole("button", { name: "행정동" })).toBeDisabled();
    expect(screen.getByRole("button", { name: /인구 밀도/ })).toBeDisabled();
  });

  it("closes and reopens both panels without creating a fixture store selection", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "상권" }));
    expect(document.querySelector(".selected-location")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "분석 결과 닫기" }));
    const inspectorOpen = screen.getByRole("button", { name: "분석 결과 열기" });
    expect(inspectorOpen).toHaveFocus();

    fireEvent.click(inspectorOpen);
    expect(screen.getByText("카페 · 상권 분석")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "분석 조건 닫기" }));
    const filtersOpen = screen.getByRole("button", { name: "분석 조건 열기" });
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
              aggregation_scope: "radius",
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

  it("updates analysis conditions and opens the comparison dialog", () => {
    render(<App />);

    fireEvent.change(screen.getByLabelText("상권 선택"), { target: { value: "합정" } });
    fireEvent.click(screen.getByRole("button", { name: "음식점" }));
    fireEvent.click(screen.getByRole("button", { name: "상권" }));
    expect(document.querySelector(".selected-location")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "직접 선택" }));
    fireEvent.click(screen.getByRole("button", { name: "500m" }));
    expect(screen.getByText("반경 500m")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "시간대 수요" }));
    expect(screen.getByRole("button", { name: "대표 시간대 수요" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "상권 비교 열기" }));
    expect(screen.getByRole("dialog", { name: "상권 비교" })).toBeInTheDocument();
  });

  it("switches between the LocalTwin and original map presentations", () => {
    render(<App />);

    const localTwinMode = screen.getByRole("button", { name: "LocalTwin" });
    const originalMode = screen.getByRole("button", { name: "실제 지도" });
    const buildings = screen.getByRole("button", { name: "건물 레이어 표시" });
    const prefabs = screen.getByRole("button", { name: "3D" });

    expect(localTwinMode).toHaveAttribute("aria-pressed", "true");
    expect(originalMode).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText(/LocalTwin map data/)).toBeInTheDocument();

    fireEvent.click(originalMode);
    expect(localTwinMode).toHaveAttribute("aria-pressed", "false");
    expect(originalMode).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText(/OpenFreeMap/)).toBeInTheDocument();

    fireEvent.click(buildings);
    fireEvent.click(prefabs);
    expect(buildings).toHaveAttribute("aria-pressed", "false");
    expect(prefabs).toHaveAttribute("aria-pressed", "false");
  });

  it("opens the Gwanpyeong upload pipeline as a supporting feature", async () => {
    render(<App />);

    expect(screen.queryByRole("option", { name: /관평동/ })).not.toBeInTheDocument();
    const sceneTrigger = screen.getByRole("button", { name: /관평동 3D 장소/ });
    sceneTrigger.focus();
    fireEvent.click(sceneTrigger);

    expect(await screen.findByRole("dialog", { name: "관평동 3D 장소 생성" })).toBeInTheDocument();
    expect(screen.getByText("촬영물 업로드")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "자동 변환 시작" })).toBeInTheDocument();
    expect(screen.getByText("GPU worker")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "13:00" })).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(screen.getByRole("button", { name: "18:00" }));
    expect(screen.getByRole("button", { name: "18:00" })).toHaveAttribute("aria-pressed", "true");

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "관평동 3D 장소 생성" })).not.toBeInTheDocument();
    await waitFor(
      () => expect(screen.getByRole("button", { name: /관평동 3D 장소/ })).toHaveFocus(),
      { timeout: 5000 },
    );
  }, 10_000);

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

    expect(screen.getByText("연남 테스트 카페")).toBeInTheDocument();
    expect(screen.getByText("카페 · 서울 마포구 동교로 1")).toBeInTheDocument();
    expect(screen.queryByText(/분석 지표는 현재 지원 업종인/)).not.toBeInTheDocument();
    expect(document.querySelector("main")).toHaveAttribute("data-storefront-3d-state", "selected");
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
              ? "해당 세부 업종은 점포 위치와 반경 경쟁 지표만 제공합니다."
              : "분석 근거 없음",
          },
          aggregation_scope: "radius",
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

    expect(screen.getAllByText("꽃집").length).toBeGreaterThan(0);
    expect((await screen.findAllByText("부분 지원")).length).toBeGreaterThan(0);
    expect(screen.queryByText("입지 점수")).not.toBeInTheDocument();
    expect(screen.queryByText(/카페 기준/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "상권 비교 열기" })).toBeDisabled();
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining(`category=${encodeURIComponent("꽃집")}`),
        expect.any(Object),
      ),
    );
    expect(new URL(window.location.href).searchParams.get("selectedCategory")).toBe("꽃집");

    fireEvent.click(screen.getByRole("button", { name: "500m" }));
    await waitFor(() => expect(document.querySelector(".selected-location")).toBeNull());
    expect(document.querySelector("main")).toHaveAttribute("data-storefront-3d-state", "idle");
    expect(new URL(window.location.href).searchParams.get("radius")).toBe("500");
  });
});
