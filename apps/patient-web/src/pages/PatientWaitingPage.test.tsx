import type { QueuePosition } from "@baro-jinryo/shared";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { PatientWaitingPage } from "./PatientWaitingPage";

vi.mock("../components/AppHeader", () => ({
  AppHeader: () => <header>바로진료</header>,
}));

const waiting: QueuePosition = {
  entry: {
    id: "30000000-0000-4000-8000-000000000001",
    ticketNumber: "4",
    source: "remote",
    inputMode: "total_only",
    patientCounts: {},
    patientCount: 1,
    categorySnapshot: [],
    status: "remote_waiting",
    registeredAt: "2026-07-29T01:00:00.000Z",
    deferred: false,
  },
  teamNumber: 1,
  position: 6,
  positionEnd: 6,
  estimatedMinutes: 50,
};

function renderPage(position: QueuePosition) {
  render(
    <MemoryRouter>
      <PatientWaitingPage waiting={position} onCancel={vi.fn()} onDefer={vi.fn()} />
    </MemoryRouter>,
  );
}

describe("PatientWaitingPage mock 알림톡", () => {
  it("순서가 6번째 이하가 되면 방문 준비 mock 알림톡을 표시한다", () => {
    renderPage(waiting);

    expect(screen.getByLabelText("방문 준비 알림 mock 알림톡")).toHaveTextContent(
      "병원 방문을 준비해 주세요",
    );
    expect(screen.getByText("현재 6번째이며 예상 약 50분입니다. 이동 준비를 시작해 주세요."))
      .toBeInTheDocument();
  });

  it("입장 요청 상태가 되면 데스크 접수 mock 알림톡을 표시하고 닫을 수 있다", () => {
    renderPage({
      ...waiting,
      entry: { ...waiting.entry, status: "entry_requested" },
      position: 4,
      estimatedMinutes: 20,
    });

    expect(screen.getByLabelText("입장 요청 알림 mock 알림톡")).toHaveTextContent(
      "데스크 접수를 진행해 주세요",
    );

    fireEvent.click(screen.getByRole("button", { name: "입장 안내 확인" }));

    expect(screen.queryByLabelText("입장 요청 알림 mock 알림톡")).toBeNull();
  });
});
