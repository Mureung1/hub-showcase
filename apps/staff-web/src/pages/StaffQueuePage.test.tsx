import {
  defaultQueueSettings,
  type NotificationReceipt,
  type QueueEntry,
  type StaffNotificationHistoryItem,
} from "@baro-jinryo/shared";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { StaffQueuePage } from "./StaffQueuePage";

const entry: QueueEntry = {
  id: "30000000-0000-4000-8000-000000000001",
  ticketNumber: "4",
  source: "remote",
  inputMode: "total_only",
  patientCounts: {},
  patientCount: 1,
  categorySnapshot: [],
  status: "entry_requested",
  registeredAt: "2026-07-24T01:00:00.000Z",
  deferred: false,
};

const secondEntry: QueueEntry = {
  ...entry,
  id: "30000000-0000-4000-8000-000000000002",
  ticketNumber: "5",
  source: "onsite",
  status: "onsite_waiting",
  registeredAt: "2026-07-24T01:01:00.000Z",
};

const notifications: StaffNotificationHistoryItem[] = [
  {
    id: "40000000-0000-4000-8000-000000000001",
    notificationType: "preparation",
    deliveryStatus: "sent",
    templateCode: "BJ_PREPARATION",
    sentAt: "2026-07-24T01:10:00.000Z",
    createdAt: "2026-07-24T01:09:59.000Z",
  },
  {
    id: "40000000-0000-4000-8000-000000000002",
    notificationType: "entry_requested",
    deliveryStatus: "failed",
    templateCode: "BJ_ENTRY_REQUESTED",
    sentAt: "2026-07-24T01:20:00.000Z",
    createdAt: "2026-07-24T01:19:59.000Z",
  },
];

function renderPage(
  onGetNotificationHistory = vi.fn(async () => notifications),
  connectionStatus: "connected" | "retrying" = "connected",
  onRetry = vi.fn(async () => undefined),
  onSaveQueueSettings = vi.fn(async () => undefined),
  onChangeStatus = vi.fn(async () => undefined),
  onReorder = vi.fn(async () => undefined),
  entries: QueueEntry[] = [entry],
  onAddOnsite = vi.fn(async () => undefined as unknown as NotificationReceipt),
) {
  render(
    <StaffQueuePage
      entries={entries}
      queueDate="2026-07-24"
      patientCategories={[]}
      nextDayCategories={[]}
      patientInputMode="total_only"
      nextDayInputMode="total_only"
      queueStatus="open"
      settings={{ ...defaultQueueSettings }}
      onAddOnsite={onAddOnsite}
      onChangeQueueStatus={vi.fn()}
      onSaveQueueSettings={onSaveQueueSettings}
      onChangeStatus={onChangeStatus}
      onHold={vi.fn()}
      onRestore={vi.fn()}
      onReorder={onReorder}
      onSavePatientConfiguration={vi.fn()}
      onRefresh={vi.fn()}
      onGetNotificationHistory={onGetNotificationHistory}
      connectionStatus={connectionStatus}
      onRetry={onRetry}
      onOpenHospitalManagement={vi.fn()}
      onSignOut={vi.fn()}
    />,
  );
  return { onGetNotificationHistory, onSaveQueueSettings };
}

describe("StaffQueuePage 네트워크 재시도", () => {
  it("연결 실패 상태에서도 기존 대기열을 유지하고 재시도할 수 있다", async () => {
    const onRetry = vi.fn(async () => undefined);
    renderPage(
      vi.fn(async () => notifications),
      "retrying",
      onRetry,
    );

    expect(screen.getByRole("cell", { name: "4" })).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("서버 연결이 끊겼습니다");

    fireEvent.click(screen.getByRole("button", { name: "지금 다시 시도" }));
    await waitFor(() => expect(onRetry).toHaveBeenCalledTimes(1));
  });
});

describe("StaffQueuePage 알림 발송 이력", () => {
  it("선택한 환자의 알림 종류와 발송 결과를 표시한다", async () => {
    const { onGetNotificationHistory } = renderPage();

    fireEvent.click(screen.getByRole("cell", { name: "4" }));

    await waitFor(() => expect(onGetNotificationHistory).toHaveBeenCalledWith(entry.id));
    const history = await screen.findByRole("region", {
      name: "알림 발송 이력",
    });
    expect(within(history).getByText("방문 준비")).toBeInTheDocument();
    expect(within(history).getByText("입장 요청")).toBeInTheDocument();
    expect(within(history).getByText("발송 완료")).toBeInTheDocument();
    expect(within(history).getByText("발송 실패")).toBeInTheDocument();
  });

  it("알림 이력이 없으면 빈 상태를 표시한다", async () => {
    renderPage(vi.fn(async () => []));

    fireEvent.click(screen.getByRole("cell", { name: "4" }));

    expect(await screen.findByText("아직 발송된 알림이 없습니다.")).toBeInTheDocument();
  });
});

describe("StaffQueuePage 운영 설정", () => {
  it("운영 중인 대기열에는 원격 웨이팅 종료 버튼을 표시한다", () => {
    renderPage();

    expect(
      screen.getByRole("button", { name: "원격 웨이팅 종료" }),
    ).toBeInTheDocument();
  });

  it("평균 진료시간과 알림 기준, 원격 접수 한도를 저장한다", async () => {
    const onSaveQueueSettings = vi.fn(async () => undefined);
    renderPage(
      vi.fn(async () => notifications),
      "connected",
      vi.fn(async () => undefined),
      onSaveQueueSettings,
    );

    fireEvent.click(screen.getByRole("button", { name: "운영 설정" }));
    fireEvent.change(screen.getByLabelText("평균 진료시간"), {
      target: { value: "15" },
    });
    fireEvent.click(screen.getByRole("button", { name: "설정 저장" }));

    await waitFor(() =>
      expect(onSaveQueueSettings).toHaveBeenCalledWith({
        averageMinutesPerPatient: 15,
        preparationThreshold: 6,
        entryThreshold: 4,
        maxRemoteWaitingPatients: 20,
      }),
    );
  });
});

describe("StaffQueuePage 현장 접수 알림톡", () => {
  it("현장 환자를 등록하면 알림톡 mock 미리보기와 상태 링크를 표시한다", async () => {
    const onsiteReceipt: NotificationReceipt = {
      id: "50000000-0000-4000-8000-000000000001",
      recipientPhoneMasked: "0101-****-9265",
      templateCode: "onsite_registered",
      openPath: "/onsite-status/mock-token",
    };
    const onAddOnsite = vi.fn(async () => onsiteReceipt);
    renderPage(
      vi.fn(async () => notifications),
      "connected",
      vi.fn(async () => undefined),
      vi.fn(async () => undefined),
      vi.fn(async () => undefined),
      vi.fn(async () => undefined),
      [entry],
      onAddOnsite,
    );

    fireEvent.click(screen.getByRole("button", { name: "현장 환자 등록" }));
    fireEvent.change(screen.getByLabelText("휴대전화 번호"), {
      target: { value: "01091309265" },
    });
    fireEvent.click(screen.getByRole("button", { name: "대기열에 추가" }));

    expect(await screen.findByLabelText("현장 접수 알림톡 미리보기")).toHaveTextContent(
      "현장 접수가 완료되었습니다.",
    );
    expect(screen.getByText("0101-****-9265")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /현재 대기 상태 보기/ })).toHaveAttribute(
      "href",
      "http://127.0.0.1:5173/onsite-status/mock-token",
    );
  });
});

describe("StaffQueuePage 상태 변경 오류", () => {
  it("잘못된 상태 전환이면 서버 오류 메시지를 화면에 표시한다", async () => {
    const onChangeStatus = vi.fn(async () => {
      throw new Error("현재 상태에서는 요청한 처리를 할 수 없습니다.");
    });
    renderPage(
      vi.fn(async () => notifications),
      "connected",
      vi.fn(async () => undefined),
      vi.fn(async () => undefined),
      onChangeStatus,
    );

    fireEvent.click(screen.getByRole("button", { name: "도착 처리" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("대기열 작업을 처리하지 못했습니다");
    expect(alert).toHaveTextContent("현재 상태에서는 요청한 처리를 할 수 없습니다.");
  });

  it("순서가 동시에 변경되면 현재 순서와 요청 순서를 전달하고 충돌을 표시한다", async () => {
    const onReorder = vi.fn(async () => {
      throw new Error("대기열이 변경되었습니다. 새로고침 후 다시 시도해 주세요.");
    });
    renderPage(
      vi.fn(async () => notifications),
      "connected",
      vi.fn(async () => undefined),
      vi.fn(async () => undefined),
      vi.fn(async () => undefined),
      onReorder,
      [entry, secondEntry],
    );

    fireEvent.click(screen.getByRole("button", { name: "접수번호 4 한 칸 아래로" }));

    await waitFor(() =>
      expect(onReorder).toHaveBeenCalledWith(
        [entry.id, secondEntry.id],
        [secondEntry.id, entry.id],
      ),
    );
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("대기열이 변경되었습니다");
    expect(alert).toHaveTextContent("새로고침 후 다시 시도해 주세요.");
  });
});
