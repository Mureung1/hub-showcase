import { hospitalChangeRequestStatusSchema } from "@baro-jinryo/shared";
import { Router, type RequestHandler } from "express";
import { z } from "zod";
import { getPlatformContext } from "../middleware/requirePlatformContext.js";
import type { HospitalManagementService } from "../services/hospitalManagementService.js";

export function createPlatformRouter(
  service: HospitalManagementService,
  requirePlatformContext: RequestHandler,
): Router {
  const router = Router();
  router.use(requirePlatformContext);

  router.get("/hospital-change-requests", async (_request, response) => {
    response.json(await service.listChangeRequests());
  });

  router.patch("/hospital-change-requests/:requestId", async (request, response) => {
    const requestId = z.uuid().parse(request.params.requestId);
    const status = hospitalChangeRequestStatusSchema.extract(["approved", "rejected"]).parse(
      request.body?.status,
    );
    const { accountId } = getPlatformContext(response.locals);
    response.json(await service.reviewChangeRequest(requestId, status, accountId));
  });

  return router;
}
