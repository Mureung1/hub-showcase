import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import PrivacyPage from "./PrivacyPage";

describe("PrivacyPage", () => {
  it("states the external AI, retention, backup, and private-reporting boundaries", () => {
    render(<PrivacyPage />);

    expect(screen.getByRole("heading", { name: "개인정보와 기록 보관 안내" })).toBeInTheDocument();
    expect(screen.getByText(/로컬 분석이 기본/)).toBeInTheDocument();
    expect(screen.getByText(/기본 90일/)).toBeInTheDocument();
    expect(screen.getByText(/최대 7일/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "비공개 보안 제보 열기" })).toHaveAttribute(
      "href",
      "https://github.com/tjwnsdhfz/hub/security/advisories/new",
    );
  });
});
