import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import JourneyHero from "./JourneyHero";

function makeTask(level) {
  return {
    id: `task-${level}`,
    title: `레벨 ${level} 대표 할 일`,
    level,
  };
}

describe("JourneyHero", () => {
  it("eyebrow와 Level을 보조 행에 두고 제목을 그다음에 표시한다", () => {
    const { container } = render(
      <JourneyHero task={makeTask(1)} onStart={vi.fn()} />,
    );

    const copy = container.querySelector(".journey-hero-copy");
    expect(copy.children[0]).toHaveClass("journey-hero-heading-row");
    expect(copy.children[1]).toHaveClass("journey-hero-title");
    expect(
      copy.querySelector(".journey-hero-heading-row .journey-hero-level"),
    ).toBeInTheDocument();
  });

  it.each([0, 1, 2, 3, 4])(
    "Lv%s에 맞는 배경과 캐릭터를 표시한다",
    (level) => {
      const { container } = render(
        <JourneyHero task={makeTask(level)} onStart={vi.fn()} />,
      );

      const hero = container.querySelector(".journey-hero");
      const character = container.querySelector(
        `.journey-hero-character-lv${level}`,
      );
      expect(hero).toHaveAttribute("data-level", String(level));
      expect(
        hero.querySelector(".journey-hero-level strong"),
      ).toHaveTextContent(`Lv${level}`);
      expect(hero.getAttribute("style")).toContain(
        `journey_lv${level}_`,
      );
      expect(character).toHaveAttribute(
        "src",
        expect.stringContaining(`nagbot_lv${level}.png`),
      );
      expect(character).toHaveAttribute("alt", "");
      expect(character).toHaveAttribute("aria-hidden", "true");
    },
  );

  it("유효하지 않은 레벨은 Lv0 에셋으로 fallback한다", () => {
    const { container } = render(
      <JourneyHero task={makeTask(9)} onStart={vi.fn()} />,
    );

    expect(container.querySelector(".journey-hero")).toHaveAttribute(
      "data-level",
      "0",
    );
    expect(container.querySelector(".journey-hero-character-lv0")).toHaveAttribute(
      "src",
      expect.stringContaining("nagbot_lv0.png"),
    );
  });

  it("세션 전용 첫 행동의 의미와 direct CTA를 구분한다", () => {
    const onStart = vi.fn();
    render(
      <JourneyHero
        task={makeTask(2)}
        microTask="슬라이드 제목 한 줄 적기"
        onStart={onStart}
      />,
    );

    expect(screen.getByText("이전에 제안한 첫 행동")).toBeInTheDocument();
    expect(screen.getByText("슬라이드 제목 한 줄 적기")).toBeInTheDocument();
    expect(
      screen.getByText(/현재 브라우저 화면에서만 참고되며/),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "할 일 바로 시작하기" }),
    );
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it("첫 행동이 없으면 새 행동을 생성하지 않고 빈 안내를 표시한다", () => {
    render(<JourneyHero task={makeTask(1)} onStart={vi.fn()} />);

    expect(screen.getByText("첫 행동 안내")).toBeInTheDocument();
    expect(
      screen.getByText(/아직 제안된 첫 행동이 없어요/),
    ).toBeInTheDocument();
  });

  it("빈 Hero는 등록 CTA를 중복하지 않는다", () => {
    render(<JourneyHero />);

    expect(
      screen.getByRole("heading", { name: "아직 시작할 여정이 없어요." }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "할 일 바로 시작하기" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
