import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ProgressBar from "./ProgressBar";

describe("ProgressBar", () => {
  it("renders a labeled progress value accessibly", () => {
    render(<ProgressBar label="기쁨 가능성" value={62} tone="joy" />);

    const progress = screen.getByRole("progressbar", {
      name: "기쁨 가능성"
    });
    expect(progress).toHaveAttribute("aria-valuemin", "0");
    expect(progress).toHaveAttribute("aria-valuemax", "100");
    expect(progress).toHaveAttribute("aria-valuenow", "62");
    expect(screen.getByText("62%")).toBeInTheDocument();
  });

  it("supports meter semantics and clamps invalid ranges", () => {
    render(
      <ProgressBar
        label="미소 강도"
        value={140}
        role="meter"
        size="compact"
      />
    );

    const meter = screen.getByRole("meter", { name: "미소 강도" });
    expect(meter).toHaveAttribute("aria-valuenow", "100");
    expect(meter.firstElementChild).toHaveStyle({ width: "100%" });
  });
});

