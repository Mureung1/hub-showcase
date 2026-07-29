import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeControl } from "./ThemeControl";

function createMediaQuery(initialMatches: boolean) {
  let listener: (() => void) | undefined;
  return {
    matches: initialMatches,
    addEventListener: vi.fn((_event: string, nextListener: () => void) => {
      listener = nextListener;
    }),
    removeEventListener: vi.fn(),
    dispatch(matches: boolean) {
      this.matches = matches;
      listener?.();
    },
  };
}

function createLegacyMediaQuery(initialMatches: boolean) {
  let listener: (() => void) | undefined;
  return {
    matches: initialMatches,
    addListener: vi.fn((nextListener: () => void) => {
      listener = nextListener;
    }),
    removeListener: vi.fn(),
    dispatch(matches: boolean) {
      this.matches = matches;
      listener?.();
    },
  };
}

describe("ThemeControl", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.dataset.theme = "light";
  });

  afterEach(() => vi.unstubAllGlobals());

  it("selects and saves an explicitly chosen theme", () => {
    const media = createMediaQuery(false);
    vi.stubGlobal("matchMedia", vi.fn(() => media));
    render(<ThemeControl />);

    fireEvent.click(screen.getByRole("button", { name: "다크 테마" }));

    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
    expect(localStorage.getItem("swim-theme")).toBe("dark");
    expect(screen.getByRole("button", { name: "다크 테마" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("restores system preference and follows operating system changes", () => {
    localStorage.setItem("swim-theme", "system");
    const media = createMediaQuery(true);
    vi.stubGlobal("matchMedia", vi.fn(() => media));
    render(<ThemeControl />);

    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
    media.dispatch(false);
    expect(document.documentElement).toHaveAttribute("data-theme", "light");
    expect(media.addEventListener).toHaveBeenCalledWith("change", expect.any(Function));
  });

  it("restores an explicit preference without subscribing to system changes", () => {
    localStorage.setItem("swim-theme", "light");
    const media = createMediaQuery(true);
    vi.stubGlobal("matchMedia", vi.fn(() => media));
    render(<ThemeControl />);

    expect(document.documentElement).toHaveAttribute("data-theme", "light");
    expect(media.addEventListener).not.toHaveBeenCalled();
  });

  it("exposes the theme choices as one labelled group with one current value", () => {
    const media = createMediaQuery(false);
    vi.stubGlobal("matchMedia", vi.fn(() => media));
    render(<ThemeControl />);

    const group = screen.getByRole("group", { name: "화면 테마" });
    const choices = Array.from(group.querySelectorAll("button"));

    expect(choices).toHaveLength(3);
    expect(choices.filter((choice) => choice.getAttribute("aria-pressed") === "true"))
      .toHaveLength(1);
    expect(choices.every((choice) => choice.getAttribute("aria-label")?.endsWith("테마")))
      .toBe(true);
  });

  it("follows system changes in browsers that only provide legacy media listeners", () => {
    localStorage.setItem("swim-theme", "system");
    const media = createLegacyMediaQuery(false);
    vi.stubGlobal("matchMedia", vi.fn(() => media));
    const { unmount } = render(<ThemeControl />);

    media.dispatch(true);
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");

    unmount();
    expect(media.removeListener).toHaveBeenCalled();
  });
});
