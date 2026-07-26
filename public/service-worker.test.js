import { beforeEach, describe, expect, it, vi } from "vitest";

// service-worker.js는 self.addEventListener로 리스너를 등록하는 순수 스크립트라
// import 시 부수효과로 리스너가 전역(self)에 붙는다. jsdom 환경의 self는 window와
// 동일 객체라 이 테스트 파일에서도 같은 self를 참조해 이벤트를 디스패치할 수 있다.
await import("./service-worker.js");

function dispatchNotificationClick() {
  const event = new Event("notificationclick");
  event.notification = { close: vi.fn() };
  let capturedPromise;
  event.waitUntil = (promise) => {
    capturedPromise = promise;
  };
  self.dispatchEvent(event);
  return capturedPromise;
}

// 스펙상 WindowClient.focus()는 성공 시 자기 자신(WindowClient)을 resolve한다
// (MDN: "resolves with the focused WindowClient"). undefined 등 임의 값으로
// 목킹하면 실제와 다른 조건에서 우연히 테스트가 통과할 수 있어 그대로 맞춘다.
function fakeClient(focusImpl) {
  const client = { focus: undefined };
  client.focus = vi.fn(focusImpl ?? (() => Promise.resolve(client)));
  return client;
}

describe("service-worker notificationclick", () => {
  beforeEach(() => {
    self.clients = {
      matchAll: vi.fn(),
      openWindow: vi.fn(),
    };
  });

  it("첫 client의 focus()가 성공하면 그 client에서 끝나고 openWindow는 호출하지 않는다 (happy path)", async () => {
    const client = fakeClient();
    self.clients.matchAll.mockResolvedValue([client]);

    await dispatchNotificationClick();

    expect(client.focus).toHaveBeenCalledTimes(1);
    expect(self.clients.openWindow).not.toHaveBeenCalled();
  });

  it("첫 client의 focus()가 실패하면 다음 client로 넘어간다 (경계)", async () => {
    const failing = fakeClient(() => Promise.reject(new Error("Not allowed to focus a window")));
    const succeeding = fakeClient();
    self.clients.matchAll.mockResolvedValue([failing, succeeding]);

    await dispatchNotificationClick();

    expect(failing.focus).toHaveBeenCalledTimes(1);
    expect(succeeding.focus).toHaveBeenCalledTimes(1);
    expect(self.clients.openWindow).not.toHaveBeenCalled();
  });

  it("모든 client의 focus()가 실패하면 openWindow('/home')으로 폴백한다 (경계)", async () => {
    const a = fakeClient(() => Promise.reject(new Error("fail")));
    const b = fakeClient(() => Promise.reject(new Error("fail")));
    self.clients.matchAll.mockResolvedValue([a, b]);

    await dispatchNotificationClick();

    expect(a.focus).toHaveBeenCalledTimes(1);
    expect(b.focus).toHaveBeenCalledTimes(1);
    expect(self.clients.openWindow).toHaveBeenCalledWith("/home");
  });

  it("열린 탭이 하나도 없으면 곧바로 openWindow('/home')을 호출한다 (경계)", async () => {
    self.clients.matchAll.mockResolvedValue([]);

    await dispatchNotificationClick();

    expect(self.clients.openWindow).toHaveBeenCalledWith("/home");
  });

  it("어떤 경로에서도 강제 리로드(navigate/postMessage)를 시도하지 않는다 (회귀 방지)", async () => {
    const client = fakeClient();
    client.navigate = vi.fn();
    client.postMessage = vi.fn();
    self.clients.matchAll.mockResolvedValue([client]);

    await dispatchNotificationClick();

    expect(client.navigate).not.toHaveBeenCalled();
    expect(client.postMessage).not.toHaveBeenCalled();
  });
});
