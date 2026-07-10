import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { App } from "./App";

afterEach(cleanup);

describe("App", () => {
  it("renders the interactive market analysis demo", () => {
    render(<App />);

    expect(screen.getByText("LocalTwin")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Docs" })).toHaveAttribute(
      "href",
      "/docs/wiki/doc-viewer.html?doc=Home.md",
    );
    expect(screen.getByRole("region", { name: "상권 분석 작업 공간" })).toBeInTheDocument();
    expect(screen.getByText("입지 점수")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "다른 상권과 비교" })).toBeInTheDocument();
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
});
