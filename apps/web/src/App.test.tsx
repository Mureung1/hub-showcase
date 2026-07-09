import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { App } from "./App";

describe("App", () => {
  it("renders the LocalTwin application shell", () => {
    render(<App />);

    expect(screen.getByText("LocalTwin")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "상권 분석 작업 공간" })).toBeInTheDocument();
  });
});
