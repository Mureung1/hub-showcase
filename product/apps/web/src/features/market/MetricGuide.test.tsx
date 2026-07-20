import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { MetricGuide } from "./MetricGuide";

afterEach(cleanup);

describe("MetricGuide", () => {
  it("shows at most three category-specific metrics with interpretation", () => {
    render(
      <MetricGuide
        selection={{ name: "카페", code: null, analysisCategory: "카페", coverage: "full" }}
      />,
    );

    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(screen.getByText("시간대별 유동인구")).toBeInTheDocument();
    expect(screen.getByText("용어와 해석 방법")).toBeInTheDocument();
  });

  it("does not substitute another category when coverage is unavailable", () => {
    render(
      <MetricGuide
        selection={{
          name: "꽃집",
          code: "G21501",
          analysisCategory: null,
          coverage: "unavailable",
        }}
      />,
    );

    expect(screen.getByText(/다른 업종의 값을 대신 보여주지 않습니다/)).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });
});
