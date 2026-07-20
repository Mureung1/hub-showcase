import { hospitalInformationSchema } from "@baro-jinryo/shared";
import { Router, type RequestHandler } from "express";
import { getStaffContext } from "../middleware/requireStaffContext.js";
import type { HospitalManagementService } from "../services/hospitalManagementService.js";

export function createHospitalManagementRouter(
  service: HospitalManagementService,
  requireStaffContext: RequestHandler,
): Router {
  const router = Router();
  router.use(requireStaffContext);

  router.get("/hospital", async (_request, response) => {
    const { hospitalId } = getStaffContext(response.locals);
    response.json(await service.getManagementState(hospitalId));
  });

  router.post("/hospital-change-requests", async (request, response) => {
    const proposedValues = hospitalInformationSchema.parse(request.body);
    const { hospitalId, accountId } = getStaffContext(response.locals);
    response.status(201).json(await service.requestChange(hospitalId, accountId, proposedValues));
  });

  return router;
}
