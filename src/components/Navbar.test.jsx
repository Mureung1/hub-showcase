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

// pushManager.getSubscription()이 반환할 구독 존재 여부를 고정해 둔
// navigator.serviceWorker.ready mock. subscription이 null/객체로 바뀔 수 있도록
// getSubscription을 vi.fn()으로 노출해 테스트 중 반환값을 바꿀 수 있게 한다.
function setServiceWorker(initialSubscription = null) {
  const getSubscription = vi.fn().mockResolvedValue(initialSubscription);
  Object.defineProperty(navigator, "serviceWorker", {
    configurable: true,
    value: {
      ready: Promise.resolve({ pushManager: { getSubscription } }),
    },
  });
  return getSubscription;
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
    setServiceWorker(null);
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

  it("permission default에서는 '알림 켜기'가 활성 상태로 표시된다", () => {
    setNotification("default");
    renderNavbar();

    expect(
      screen.getByRole("button", { name: "🔔 알림 켜기" }),
    ).not.toBeDisabled();
  });

  it("permission denied에서는 '알림 차단됨'으로 비활성 표시된다", () => {
    setNotification("denied");
    renderNavbar();

    expect(screen.getByRole("button", { name: "🔔 알림 차단됨" })).toBeDisabled();
  });

  it("permission granted + subscription 확인 중에는 확인 중 상태로 비활성 표시된다", () => {
    setNotification("granted");
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: {
        ready: new Promise(() => {}),
      },
    });
    renderNavbar();

    expect(
      screen.getByRole("button", { name: "🔔 알림 확인 중" }),
    ).toBeDisabled();
  });

  it("permission default에서 클릭하면 기존처럼 권한 요청과 Push 구독을 수행한다", async () => {
    const requestPermission = setNotification("default");
    subscribeToPush.mockResolvedValue(undefined);
    renderNavbar();

    fireEvent.click(screen.getByRole("button", { name: "🔔 알림 켜기" }));

    await waitFor(() => {
      expect(requestPermission).toHaveBeenCalledTimes(1);
      expect(subscribeToPush).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "🔔 알림 켜짐" })).toBeDisabled();
    });
  });

  it("permission granted + subscription 없음 → 재시도 버튼이 활성 상태로 뜬다", async () => {
    setNotification("granted");
    setServiceWorker(null);
    renderNavbar();

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "🔔 알림 다시 켜기" }),
      ).not.toBeDisabled();
    });
  });

  it("permission granted + subscription 존재 → '알림 켜짐' 비활성 상태로 뜬다", async () => {
    setNotification("granted");
    setServiceWorker({ endpoint: "https://example.com/existing" });
    renderNavbar();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "🔔 알림 켜짐" })).toBeDisabled();
    });
  });

  it("재시도 버튼 클릭 시 requestPermission을 다시 호출하지 않고 바로 재구독하며, 성공하면 '켜짐'으로 갱신된다", async () => {
    const requestPermission = setNotification("granted");
    setServiceWorker(null);
    subscribeToPush.mockResolvedValue(undefined);
    renderNavbar();

    const retryButton = await screen.findByRole("button", {
      name: "🔔 알림 다시 켜기",
    });
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(subscribeToPush).toHaveBeenCalledTimes(1);
    });
    expect(requestPermission).not.toHaveBeenCalled();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "🔔 알림 켜짐" })).toBeDisabled();
    });
  });

  it("재구독이 실패하면 '켜짐'으로 잘못 표시되지 않고 재시도 가능한 상태를 유지한다", async () => {
    setNotification("granted");
    setServiceWorker(null);
    subscribeToPush.mockRejectedValue(new Error("subscribe failed"));
    renderNavbar();

    const retryButton = await screen.findByRole("button", {
      name: "🔔 알림 다시 켜기",
    });
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(subscribeToPush).toHaveBeenCalledTimes(1);
    });

    expect(
      screen.getByRole("button", { name: "🔔 알림 다시 켜기" }),
    ).not.toBeDisabled();
  });
});
