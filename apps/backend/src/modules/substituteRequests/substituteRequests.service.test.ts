import { beforeEach, describe, expect, it, vi } from "vitest";
import { StoreMembershipContext } from "../../common/types/storeMembership";
import * as membershipRepository from "../../common/repositories/storeMembership.repository";
import { ScheduleRecord } from "../schedules/schedules.types";
import * as notificationService from "../notifications/notifications.service";
import * as schedulesRepository from "../schedules/schedules.repository";
import * as storesRepository from "../stores/stores.repository";
import { StoreRecord } from "../stores/stores.types";
import * as substituteRepository from "./substituteRequests.repository";
import {
  approveSubstituteRequest,
  applyToSubstituteRequest,
  rejectSubstituteRequest
} from "./substituteRequests.service";
import {
  SubstituteApplicationRecord,
  SubstituteRequestRecord
} from "./substituteRequests.types";

vi.mock("../../common/repositories/storeMembership.repository", () => ({
  findStoreMembership: vi.fn()
}));

vi.mock("../notifications/notifications.service", () => ({
  createNotifications: vi.fn()
}));

vi.mock("../schedules/schedules.repository", () => ({
  findOverlappingWorkerSchedules: vi.fn(),
  findScheduleById: vi.fn(),
  transferScheduleToSubstitute: vi.fn()
}));

vi.mock("../stores/stores.repository", () => ({
  findStoreById: vi.fn()
}));

vi.mock("./substituteRequests.repository", () => ({
  approveSubstituteRequestById: vi.fn(),
  findActiveSubstituteRequestByScheduleId: vi.fn(),
  findSubstituteApplication: vi.fn(),
  findSubstituteRequestById: vi.fn(),
  findSubstituteRequestProfiles: vi.fn(),
  findSubstituteRequestSchedules: vi.fn(),
  findSubstituteRequestsByStoreIdAndStatuses: vi.fn(),
  insertSubstituteApplication: vi.fn(),
  insertSubstituteRequest: vi.fn(),
  rejectSubstituteRequestById: vi.fn(),
  updateSubstituteRequestCandidate: vi.fn()
}));

const storeId = "store-1";
const requestId = "request-1";
const scheduleId = "schedule-1";
const requesterId = "worker-requester";
const candidateId = "worker-candidate";
const ownerId = "owner-1";

function createMembership(input: Pick<StoreMembershipContext, "userId" | "role">): StoreMembershipContext {
  return {
    id: `membership-${input.userId}`,
    storeId,
    userId: input.userId,
    role: input.role
  };
}

function createRequest(overrides: Partial<SubstituteRequestRecord> = {}): SubstituteRequestRecord {
  return {
    id: requestId,
    store_id: storeId,
    schedule_id: scheduleId,
    requester_id: requesterId,
    candidate_worker_id: null,
    status: "OPEN",
    reason: "개인 일정",
    reject_reason: null,
    created_at: "2026-07-28T00:00:00.000Z",
    updated_at: "2026-07-28T00:00:00.000Z",
    ...overrides
  };
}

function createSchedule(overrides: Partial<ScheduleRecord> = {}): ScheduleRecord {
  return {
    id: scheduleId,
    store_id: storeId,
    worker_id: requesterId,
    work_date: "2099-01-10",
    start_time: "09:00",
    end_time: "13:00",
    position: "홀",
    memo: null,
    source: "MANUAL",
    created_at: "2026-07-28T00:00:00.000Z",
    updated_at: "2026-07-28T00:00:00.000Z",
    profiles: {
      id: requesterId,
      name: "요청자"
    },
    ...overrides
  };
}

function createApplication(workerId = candidateId): SubstituteApplicationRecord {
  return {
    id: `application-${workerId}`,
    request_id: requestId,
    worker_id: workerId,
    created_at: "2026-07-28T00:00:00.000Z"
  };
}

function createStore(): StoreRecord {
  return {
    id: storeId,
    owner_id: ownerId,
    name: "알바노트 매장",
    address: null,
    created_at: "2026-07-28T00:00:00.000Z",
    updated_at: "2026-07-28T00:00:00.000Z"
  };
}

describe("substituteRequests.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(notificationService.createNotifications).mockResolvedValue([]);
    vi.mocked(schedulesRepository.findOverlappingWorkerSchedules).mockResolvedValue([]);
    vi.mocked(storesRepository.findStoreById).mockResolvedValue(createStore());
  });

  it("첫 번째 대타 신청자를 후보자로 지정하고 승인 대기 상태로 전환한다", async () => {
    const openRequest = createRequest();
    const pendingRequest = createRequest({
      candidate_worker_id: candidateId,
      status: "PENDING_APPROVAL"
    });

    vi.mocked(substituteRepository.findSubstituteRequestById).mockResolvedValue(openRequest);
    vi.mocked(membershipRepository.findStoreMembership).mockResolvedValue(
      createMembership({ userId: candidateId, role: "WORKER" })
    );
    vi.mocked(schedulesRepository.findScheduleById).mockResolvedValue(createSchedule());
    vi.mocked(substituteRepository.findSubstituteApplication).mockResolvedValue(null);
    vi.mocked(substituteRepository.updateSubstituteRequestCandidate).mockResolvedValue(pendingRequest);
    vi.mocked(substituteRepository.insertSubstituteApplication).mockResolvedValue(createApplication());

    const response = await applyToSubstituteRequest({
      requestId,
      actorUserId: candidateId
    });

    expect(response.substituteRequest.status).toBe("PENDING_APPROVAL");
    expect(response.substituteRequest.candidateWorkerId).toBe(candidateId);
    expect(substituteRepository.updateSubstituteRequestCandidate).toHaveBeenCalledWith({
      requestId,
      actorUserId: candidateId
    });
    expect(substituteRepository.insertSubstituteApplication).toHaveBeenCalledWith({
      requestId,
      actorUserId: candidateId
    });
  });

  it("이미 신청한 대타 요청은 다시 후보자 지정으로 진행하지 않는다", async () => {
    vi.mocked(substituteRepository.findSubstituteRequestById).mockResolvedValue(createRequest());
    vi.mocked(membershipRepository.findStoreMembership).mockResolvedValue(
      createMembership({ userId: candidateId, role: "WORKER" })
    );
    vi.mocked(schedulesRepository.findScheduleById).mockResolvedValue(createSchedule());
    vi.mocked(substituteRepository.findSubstituteApplication).mockResolvedValue(createApplication());

    await expect(
      applyToSubstituteRequest({
        requestId,
        actorUserId: candidateId
      })
    ).rejects.toMatchObject({
      status: 409,
      code: "SUBSTITUTE_APPLICATION_EXISTS"
    });

    expect(substituteRepository.updateSubstituteRequestCandidate).not.toHaveBeenCalled();
    expect(substituteRepository.insertSubstituteApplication).not.toHaveBeenCalled();
  });

  it("대타 승인 시 실제 근무표를 후보 알바생에게 넘기고 요청을 승인 상태로 전환한다", async () => {
    const pendingRequest = createRequest({
      candidate_worker_id: candidateId,
      status: "PENDING_APPROVAL"
    });
    const approvedRequest = createRequest({
      candidate_worker_id: candidateId,
      status: "APPROVED"
    });

    vi.mocked(substituteRepository.findSubstituteRequestById).mockResolvedValue(pendingRequest);
    vi.mocked(membershipRepository.findStoreMembership).mockImplementation(async (_storeId, userId) => {
      if (userId === ownerId) {
        return createMembership({ userId, role: "OWNER" });
      }

      if (userId === candidateId) {
        return createMembership({ userId, role: "WORKER" });
      }

      return null;
    });
    vi.mocked(schedulesRepository.findScheduleById).mockResolvedValue(createSchedule());
    vi.mocked(schedulesRepository.transferScheduleToSubstitute).mockResolvedValue(
      createSchedule({
        worker_id: candidateId,
        source: "SUBSTITUTE"
      })
    );
    vi.mocked(substituteRepository.approveSubstituteRequestById).mockResolvedValue(approvedRequest);

    const response = await approveSubstituteRequest({
      requestId,
      actorUserId: ownerId
    });

    expect(response.substituteRequest.status).toBe("APPROVED");
    expect(schedulesRepository.transferScheduleToSubstitute).toHaveBeenCalledWith({
      scheduleId,
      currentWorkerId: requesterId,
      nextWorkerId: candidateId
    });
    expect(substituteRepository.approveSubstituteRequestById).toHaveBeenCalledWith({
      requestId,
      actorUserId: ownerId
    });
  });

  it("승인 전에 근무 담당자가 바뀌었으면 대타 승인과 근무표 변경을 막는다", async () => {
    vi.mocked(substituteRepository.findSubstituteRequestById).mockResolvedValue(
      createRequest({
        candidate_worker_id: candidateId,
        status: "PENDING_APPROVAL"
      })
    );
    vi.mocked(membershipRepository.findStoreMembership).mockImplementation(async (_storeId, userId) =>
      userId === ownerId
        ? createMembership({ userId, role: "OWNER" })
        : createMembership({ userId, role: "WORKER" })
    );
    vi.mocked(schedulesRepository.findScheduleById).mockResolvedValue(
      createSchedule({
        worker_id: "other-worker"
      })
    );

    await expect(
      approveSubstituteRequest({
        requestId,
        actorUserId: ownerId
      })
    ).rejects.toMatchObject({
      status: 409,
      code: "SCHEDULE_ALREADY_CHANGED"
    });

    expect(schedulesRepository.transferScheduleToSubstitute).not.toHaveBeenCalled();
    expect(substituteRepository.approveSubstituteRequestById).not.toHaveBeenCalled();
  });

  it("대타 거절 시 승인 대기 요청을 거절 상태로 전환한다", async () => {
    const pendingRequest = createRequest({
      candidate_worker_id: candidateId,
      status: "PENDING_APPROVAL"
    });
    const rejectedRequest = createRequest({
      candidate_worker_id: candidateId,
      reject_reason: "매장 사정",
      status: "REJECTED"
    });

    vi.mocked(substituteRepository.findSubstituteRequestById).mockResolvedValue(pendingRequest);
    vi.mocked(membershipRepository.findStoreMembership).mockResolvedValue(
      createMembership({ userId: ownerId, role: "OWNER" })
    );
    vi.mocked(schedulesRepository.findScheduleById).mockResolvedValue(createSchedule());
    vi.mocked(substituteRepository.rejectSubstituteRequestById).mockResolvedValue(rejectedRequest);

    const response = await rejectSubstituteRequest({
      requestId,
      actorUserId: ownerId,
      rejectReason: "매장 사정"
    });

    expect(response.substituteRequest.status).toBe("REJECTED");
    expect(response.substituteRequest.rejectReason).toBe("매장 사정");
    expect(substituteRepository.rejectSubstituteRequestById).toHaveBeenCalledWith({
      requestId,
      actorUserId: ownerId,
      rejectReason: "매장 사정"
    });
  });
});
