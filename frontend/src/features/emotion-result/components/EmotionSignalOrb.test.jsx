import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import EmotionSignalOrb from "./EmotionSignalOrb";

describe("EmotionSignalOrb", () => {
  it("exposes the leading three signals as accessible reference values", () => {
    render(
      <EmotionSignalOrb
        result={{
          scores: [
            { key: "joy", score: 12 },
            { key: "anxiety", score: 42 },
            { key: "neutral", score: 18 },
            { key: "sadness", score: 26 }
          ]
        }}
      />
    );

    const orb = screen.getByRole("img");
    expect(orb).toHaveAccessibleName(/불안 42%/);
    expect(orb).toHaveAccessibleName(/슬픔 26%/);
    expect(orb).toHaveAccessibleName(/중립 18%/);
    expect(orb).not.toHaveAccessibleName(/기쁨 12%/);
  });
});
