import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import ProjectIntro from "./ProjectIntro";

function renderProjectIntro() {
  return render(
    <MemoryRouter>
      <ProjectIntro />
    </MemoryRouter>,
  );
}

describe("ProjectIntro landing page", () => {
  it("renders the approved hero copy and register CTA", () => {
    renderProjectIntro();

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /미루는 이유를 찾고,\s*지금 시작할 첫 행동을 제안해요\./,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/잔소리봇이 미루는 이유를 확인하고/i),
    ).toBeInTheDocument();
    expect(screen.getByText("잔소리봇 · 대학생 학업 실행 도우미")).toBeInTheDocument();

    const ctas = screen.getAllByRole("link", { name: "첫 행동 시작하기" });
    expect(ctas).toHaveLength(2);
    for (const cta of ctas) {
      expect(cta).toHaveAttribute("href", "/register");
    }
  });

  it("renders a landing-only top bar with section links", () => {
    renderProjectIntro();

    expect(screen.getByRole("link", { name: "잔소리봇" })).toHaveAttribute(
      "href",
      "/landing",
    );
    expect(screen.getByRole("link", { name: "서비스 소개" })).toHaveAttribute(
      "href",
      "#landing-about",
    );
    expect(screen.getByRole("link", { name: "사용 흐름" })).toHaveAttribute(
      "href",
      "#landing-flow",
    );
    expect(screen.getByRole("link", { name: "시작하기" })).toHaveAttribute(
      "href",
      "/register",
    );
  });

  it("renders service sections aligned with the current app flow", () => {
    renderProjectIntro();

    expect(
      screen.getByRole("heading", { level: 2, name: "계획보다 먼저, 막히는 이유를 다룹니다" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "등록부터 완료까지, 이렇게 사용해요" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 3, name: "해야 할 일과 필요한 정보를 입력해요" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "미루는 정도에 따라 개입이 달라져요" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "집중하는 시간을, 함께 걷는 여정으로 보여줘요",
      }),
    ).toBeInTheDocument();
  });

  it("renders decorative hero and level images from src assets", () => {
    const { container } = renderProjectIntro();

    const heroCharacter = container.querySelector(".landing-hero-character");
    expect(heroCharacter).toHaveAttribute("src", "/src/assets/characters/nagbot_landing.png");
    expect(heroCharacter).toHaveAttribute("alt", "");
    expect(heroCharacter).toHaveAttribute("aria-hidden", "true");
    expect(heroCharacter).toHaveAttribute("draggable", "false");

    const background = container.querySelector(".landing-journey-background");
    expect(background).toHaveAttribute(
      "src",
      "/src/assets/backgrounds/journey_lv0_clear.png",
    );
    expect(background).toHaveAttribute("alt", "");

    const levelCharacters = container.querySelectorAll(".landing-level-character");
    expect(levelCharacters).toHaveLength(4);
    expect(levelCharacters[0]).toHaveAttribute("src", "/src/assets/characters/nagbot_lv1.png");
    expect(levelCharacters[1]).toHaveAttribute("src", "/src/assets/characters/nagbot_lv2.png");
    expect(levelCharacters[2]).toHaveAttribute("src", "/src/assets/characters/nagbot_lv3.png");
    expect(levelCharacters[3]).toHaveAttribute("src", "/src/assets/characters/nagbot_lv4.png");

    const journeyThumbs = container.querySelectorAll(".landing-journey-thumb img");
    expect(journeyThumbs).toHaveLength(5);
    expect(journeyThumbs[0]).toHaveAttribute("src", "/src/assets/backgrounds/journey_lv0_clear.png");
    expect(journeyThumbs[1]).toHaveAttribute(
      "src",
      "/src/assets/backgrounds/journey_lv1_partly_cloudy.png",
    );
    expect(journeyThumbs[2]).toHaveAttribute("src", "/src/assets/backgrounds/journey_lv2_cloudy.png");
    expect(journeyThumbs[3]).toHaveAttribute("src", "/src/assets/backgrounds/journey_lv3_rain.png");
    expect(journeyThumbs[4]).toHaveAttribute("src", "/src/assets/backgrounds/journey_lv4_storm.png");
  });

  it("hides a failed hero image without removing the visual stage", () => {
    const { container } = renderProjectIntro();

    const visual = container.querySelector(".landing-hero-stage");
    const image = container.querySelector(".landing-hero-character");
    fireEvent.error(image);

    expect(image).toHaveAttribute("hidden");
    expect(visual).toBeInTheDocument();
  });
});
