import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Navbar from "./Navbar";

const subscribeToPush = vi.fn();

vi.mock("../lib/pushSubscribe", () => ({
  subscribeToPush: () => subscribeToPush(),
}));

function setNotification(permission = "default") {
  const requestPermission = vi.fn().mockResolvedValue("granted");
  Object.defineProperty(window, "Notification", {
    configurable: true,
    value: { permission, requestPermission },
  });
  return requestPermission;
}

function renderNavbar(path = "/home") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Navbar />
    </MemoryRouter>,
  );
}

describe("Navbar brand identity", () => {
  beforeEach(() => {
    subscribeToPush.mockReset();
    setNotification();
  });

  it("Lv0 얼굴 로고와 접근 가능한 브랜드 링크를 표시한다", () => {
    const { container } = renderNavbar();
    const brand = screen.getByRole("link", { name: "잔소리봇" });
    const logo = container.querySelector(".brand-logo");

    expect(brand).toHaveAttribute("href", "/landing");
    expect(logo).toHaveAttribute(
      "src",
      expect.stringContaining("nagbot_face_lv0.png"),
    );
    expect(logo).toHaveAttribute("alt", "");
    expect(logo).toHaveAttribute("aria-hidden", "true");
    expect(container).not.toHaveTextContent("🤖");
  });

  it("기존 메뉴 경로와 active 판정을 유지한다", () => {
    renderNavbar("/register");

    expect(screen.getByRole("link", { name: "홈" })).toHaveAttribute(
      "href",
      "/home",
    );
    expect(screen.getByRole("link", { name: "할 일 등록" })).toHaveAttribute(
      "href",
      "/register",
    );
    expect(screen.getByRole("link", { name: "히스토리" })).toHaveAttribute(
      "href",
      "/history",
    );
    expect(screen.getByRole("link", { name: "할 일 등록" })).toHaveClass(
      "active",
    );
  });

  it("기본 권한에서는 기존 알림 요청과 Push 구독 흐름을 유지한다", async () => {
    const requestPermission = setNotification("default");
    renderNavbar();

    fireEvent.click(screen.getByRole("button", { name: "🔔 알림 켜기" }));

    await waitFor(() => {
      expect(requestPermission).toHaveBeenCalledTimes(1);
      expect(subscribeToPush).toHaveBeenCalledTimes(1);
    });
    expect(screen.getByRole("button", { name: "🔔 알림 켜짐" })).toBeDisabled();
  });

  it.each([
    ["granted", "🔔 알림 켜짐"],
    ["denied", "🔔 알림 차단됨"],
  ])("%s 권한의 기존 disabled 정책을 유지한다", (permission, label) => {
    setNotification(permission);
    renderNavbar();

    expect(screen.getByRole("button", { name: label })).toBeDisabled();
  });
});
