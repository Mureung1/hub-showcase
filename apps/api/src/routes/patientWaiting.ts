import { patientRegistrationInputSchema } from "@baro-jinryo/shared";
import { Router, type RequestHandler } from "express";
import { z } from "zod";
import { getPatientContext } from "../middleware/requirePatientContext.js";
import type { PatientWaitingOperations } from "../services/patientWaitingService.js";

export function createPatientWaitingRouter(
  service: PatientWaitingOperations,
  requirePatientContext: RequestHandler,
): Router {
  const router = Router();
  router.get("/hospitals/:hospitalId", async (request, response) => {
    const hospitalId = z.uuid().parse(request.params.hospitalId);
    response.json(await service.getHospitalConfig(hospitalId));
  });
  router.use(requirePatientContext);

  router.post("/hospitals/:hospitalId/waitings", async (request, response) => {
    const hospitalId = z.uuid().parse(request.params.hospitalId);
    const input = patientRegistrationInputSchema.parse(request.body);
    const { accountId } = getPatientContext(response.locals);
    response.status(201).json(await service.register(accountId, hospitalId, input));
  });

  router.get("/me/waiting", async (_request, response) => {
    const { accountId } = getPatientContext(response.locals);
    response.json({ waiting: await service.getActive(accountId) });
  });

  router.post("/me/waiting/defer", async (_request, response) => {
    const { accountId } = getPatientContext(response.locals);
    response.json({ waiting: await service.defer(accountId) });
  });

  router.post("/me/waiting/cancel", async (_request, response) => {
    const { accountId } = getPatientContext(response.locals);
    response.json({ waiting: await service.cancel(accountId) });
  });

  return router;
}
