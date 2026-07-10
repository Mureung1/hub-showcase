import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { App } from "./App";

afterEach(cleanup);

describe("App", () => {
  it("renders the interactive market analysis demo", () => {
    render(<App />);

    expect(screen.getByRole("link", { name: "LocalTwin 상권 분석 홈" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Docs" })).toHaveAttribute(
      "href",
      "/docs/wiki/doc-viewer.html?doc=Home.md",
    );
    expect(screen.getByRole("region", { name: "상권 분석 작업 공간" })).toBeInTheDocument();
    expect(screen.getByText("입지 점수")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "다른 상권과 비교" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /관평동 3D 장소/ })).toBeInTheDocument();
  });

  it("updates the selected candidate and opens the major analysis dialogs", () => {
    render(<App />);

    fireEvent.change(screen.getByLabelText("상권 선택"), { target: { value: "합정" } });
    fireEvent.click(screen.getByRole("button", { name: "음식점" }));
    expect(screen.getAllByText("스파카 나폴리 합정")).toHaveLength(2);
    expect(screen.getByText("음식점 · 마포구 양화로 45 일대")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "500m" }));
    expect(screen.getByText("반경 500m")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "시간대 수요" }));
    expect(screen.getByRole("button", { name: "대표 시간대 수요" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "점수 산정 근거" }));
    expect(screen.getByRole("dialog", { name: "데이터 산정 근거" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "확인" }));

    fireEvent.click(screen.getByRole("button", { name: "다른 상권과 비교" }));
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

    fireEvent.click(originalMode);
    expect(localTwinMode).toHaveAttribute("aria-pressed", "false");
    expect(originalMode).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(buildings);
    fireEvent.click(prefabs);
    expect(buildings).toHaveAttribute("aria-pressed", "false");
    expect(prefabs).toHaveAttribute("aria-pressed", "false");
  });

  it("keeps the Gwanpyeong 3D site separate and marks it as capture preparation", () => {
    render(<App />);

    expect(screen.queryByRole("option", { name: /관평동/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /관평동 3D 장소/ }));

    expect(screen.getByRole("dialog", { name: "대전 유성구 관평동" })).toBeInTheDocument();
    expect(screen.getByText("Gaussian Splatting 촬영·복원 대상")).toBeInTheDocument();
    expect(screen.getByText("실제 3DGS asset 연결 전")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "13:00" })).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(screen.getByRole("button", { name: "18:00" }));
    expect(screen.getByRole("button", { name: "18:00" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "촬영 후 장면 열기" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "3D 장소 닫기" }));
    expect(screen.queryByRole("dialog", { name: "대전 유성구 관평동" })).not.toBeInTheDocument();
  });
});
