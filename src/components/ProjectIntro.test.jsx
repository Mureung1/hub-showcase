import { fireEvent, render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import ProjectIntro from "./ProjectIntro";

describe("ProjectIntro character visual", () => {
  it("renders the landing-only character as a decorative image", () => {
    const { container } = render(
      <MemoryRouter>
        <ProjectIntro />
      </MemoryRouter>,
    );

    const image = container.querySelector(".landing-hero-character");
    expect(image).toHaveAttribute("src", "/assets/jansori-bot-landing.png");
    expect(image).toHaveAttribute("alt", "");
    expect(image).toHaveAttribute("aria-hidden", "true");
    expect(image).toHaveAttribute("draggable", "false");
  });

  it("hides a failed character image without removing its visual container", () => {
    const { container } = render(
      <MemoryRouter>
        <ProjectIntro />
      </MemoryRouter>,
    );

    const visual = container.querySelector(".landing-hero-visual");
    const image = container.querySelector(".landing-hero-character");
    fireEvent.error(image);

    expect(image).toHaveAttribute("hidden");
    expect(visual).toBeInTheDocument();
  });
});
