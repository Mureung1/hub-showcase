import { Router } from "express";
import { authenticate } from "../../common/middlewares/authenticate";
import { requireStoreRole } from "../../common/middlewares/requireStoreRole";
import { createSubstituteRequestController } from "./substituteRequests.controller";

export const substituteRequestsRouter = Router({ mergeParams: true });

substituteRequestsRouter.post("/", authenticate, requireStoreRole(["WORKER"]), createSubstituteRequestController);
