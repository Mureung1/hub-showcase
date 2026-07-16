import {
  patientRegistrationInputSchema,
  queueStatusSchema,
  waitingStatusSchema,
} from "@baro-jinryo/shared";
import { Router, type RequestHandler } from "express";
import { z } from "zod";
import type { StaffQueueOperations } from "../services/staffQueueService.js";
import { getStaffContext } from "../middleware/requireStaffContext.js";

const onsiteWaitingBodySchema = z.object({
  phoneNumber: z
    .string()
    .trim()
    .regex(/^01[016789]-?\d{3,4}-?\d{4}$/, "국내 휴대전화 번호를 입력해 주세요.")
    .transform((phoneNumber) => `+82${phoneNumber.replace(/\D/g, "").slice(1)}`),
  registration: patientRegistrationInputSchema,
});
const staffStatusBodySchema = z.object({
  status: waitingStatusSchema.extract(["onsite_waiting", "called", "cancelled"]),
  reason: z.string().trim().min(2).max(200).optional(),
}).superRefine((value, context) => {
  if (value.status === "cancelled" && !value.reason) {
    context.addIssue({ code: "custom", path: ["reason"], message: "취소 사유를 입력해 주세요." });
  }
});

export function createStaffRouter(
  service: StaffQueueOperations,
  requireStaffContext: RequestHandler,
): Router {
  const router = Router();
  router.use(requireStaffContext);

  router.get("/queue", async (_request, response) => {
    const { hospitalId } = getStaffContext(response.locals);
    response.json(await service.getTodayQueue(hospitalId));
  });

  router.post("/waitings", async (request, response) => {
    const input = onsiteWaitingBodySchema.parse(request.body);
    const { hospitalId } = getStaffContext(response.locals);
    response.status(201).json(await service.registerOnsite(hospitalId, input));
  });

  router.patch("/queue/status", async (request, response) => {
    const { status } = z.object({ status: queueStatusSchema }).parse(request.body);
    const { hospitalId } = getStaffContext(response.locals);
    response.json(await service.setQueueStatus(hospitalId, status));
  });

  router.patch("/waitings/:waitingId/status", async (request, response) => {
    const waitingId = z.uuid().parse(request.params.waitingId);
    const { status, reason } = staffStatusBodySchema.parse(request.body);
    const { hospitalId, accountId } = getStaffContext(response.locals);
    response.json(
      await service.changeWaitingStatus(hospitalId, waitingId, status, accountId, reason),
    );
  });

  router.post("/waitings/:waitingId/hold", async (request, response) => {
    const waitingId = z.uuid().parse(request.params.waitingId);
    const { hospitalId, accountId } = getStaffContext(response.locals);
    response.json(await service.holdWaiting(hospitalId, waitingId, accountId));
  });

  router.post("/waitings/:waitingId/restore", async (request, response) => {
    const waitingId = z.uuid().parse(request.params.waitingId);
    const { position } = z.object({ position: z.number().int().positive().optional() }).parse(request.body ?? {});
    const { hospitalId, accountId } = getStaffContext(response.locals);
    response.json(await service.restoreWaiting(hospitalId, waitingId, accountId, position));
  });

  router.put("/waitings/order", async (request, response) => {
    const { orderedWaitingIds } = z.object({
      orderedWaitingIds: z.array(z.uuid()).min(1),
    }).parse(request.body);
    const { hospitalId, accountId } = getStaffContext(response.locals);
    response.json(await service.reorderWaitings(hospitalId, orderedWaitingIds, accountId));
  });

  return router;
}
