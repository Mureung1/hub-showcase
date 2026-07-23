import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ScenarioSelector from "./ScenarioSelector";

describe("ScenarioSelector", () => {
  it("renders scenarios and reports a changed selection", () => {
    const handleChange = vi.fn();

    render(
      <ScenarioSelector
        value="normal"
        onChange={handleChange}
      />
    );

    const scenarioButtons = screen.getAllByRole("button");

    expect(scenarioButtons).toHaveLength(3);
    expect(scenarioButtons[0]).toHaveAttribute("aria-pressed", "true");
    expect(scenarioButtons[1]).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(scenarioButtons[1]);

    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(handleChange).toHaveBeenCalledWith("tension");
  });
});
