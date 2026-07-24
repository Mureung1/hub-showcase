import cors from "cors";
import express, { type Express } from "express";
import { env } from "./config/env.js";
import { createStaffQueueService } from "./composition/staffQueue.js";
import { createStaffAuthMiddleware } from "./composition/staffAuth.js";
import {
  createHospitalManagementService,
  createPlatformAuthMiddleware,
} from "./composition/hospitalManagement.js";
import { createOnsiteStatusService } from "./composition/onsiteStatus.js";
import { createPatientAuthMiddleware } from "./composition/patientAuth.js";
import { createPatientWaitingService } from "./composition/patientWaiting.js";
import { createPatientProfileDependencies } from "./composition/patientProfile.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { notFound } from "./middleware/notFound.js";
import { requestLogger } from "./middleware/requestLogger.js";
import { healthRouter } from "./routes/health.js";
import { mockOnboardingRouter } from "./routes/mockOnboarding.js";
import { createStaffRouter } from "./routes/staff.js";
import { createHospitalManagementRouter } from "./routes/hospitalManagement.js";
import { createPlatformRouter } from "./routes/platform.js";
import { createOnsiteStatusRouter } from "./routes/onsiteStatus.js";
import { createPatientWaitingRouter } from "./routes/patientWaiting.js";
import { createPatientProfileRouter } from "./routes/patientProfile.js";

export function createApp(): Express {
  const app = express();

  app.disable("x-powered-by");
  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
  app.use(express.json({ limit: "1mb" }));
  app.use(requestLogger);

  app.use("/api/health", healthRouter);
  app.use("/api/mock", mockOnboardingRouter);
  app.use("/api/waitings/status", createOnsiteStatusRouter(createOnsiteStatusService()));
  const patientProfile = createPatientProfileDependencies();
  app.use(
    "/api",
    createPatientProfileRouter(patientProfile.authVerifier, patientProfile.service),
  );
  app.use(
    "/api",
    createPatientWaitingRouter(createPatientWaitingService(), createPatientAuthMiddleware()),
  );
  app.use(
    "/api/staff",
    createStaffRouter(createStaffQueueService(), createStaffAuthMiddleware()),
  );
  const hospitalManagementService = createHospitalManagementService();
  app.use(
    "/api/staff",
    createHospitalManagementRouter(hospitalManagementService, createStaffAuthMiddleware()),
  );
  app.use(
    "/api/platform",
    createPlatformRouter(hospitalManagementService, createPlatformAuthMiddleware()),
  );

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
