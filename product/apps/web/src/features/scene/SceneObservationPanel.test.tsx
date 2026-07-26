import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  createSceneCrowdPositions,
  GWANPYEONG_SCENE_OBSERVATIONS,
} from "./sceneObservations";
import { SceneObservationPanel } from "./SceneObservationPanel";

describe("SceneObservationPanel", () => {
  it("explains fixture provenance and changes the selected time", () => {
    const onChange = vi.fn();

    render(
      <SceneObservationPanel
        observations={GWANPYEONG_SCENE_OBSERVATIONS}
        selectedTime="13:00"
        onChange={onChange}
      />,
    );

    expect(screen.getByText("개발용 관찰 fixture")).toBeInTheDocument();
    expect(screen.getByText("높음 · 장면 표본 18개")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "18:00 혼잡도 보기" }));

    expect(onChange).toHaveBeenCalledWith("18:00");
  });

  it("creates stable positions only inside the configured walkable strip", () => {
    const first = createSceneCrowdPositions("18:00", 24);
    const second = createSceneCrowdPositions("18:00", 24);

    expect(first).toEqual(second);
    expect(first).toHaveLength(24);
    expect(
      first.every(
        ({ x, z }) =>
          x >= 0.2 &&
          x <= 0.8 &&
          z >= 0.55 &&
          z <= 0.78 &&
          !(x >= 0.45 && x <= 0.56 && z >= 0.6 && z <= 0.7),
      ),
    ).toBe(true);
  });
});
