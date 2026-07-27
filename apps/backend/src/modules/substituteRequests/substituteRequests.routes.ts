import { Router } from "express";
import { authenticate } from "../../common/middlewares/authenticate";
import { requireStoreRole } from "../../common/middlewares/requireStoreRole";
import {
  createSubstituteRequestController,
  listSubstituteRequestsController
} from "./substituteRequests.controller";

export const substituteRequestsRouter = Router({ mergeParams: true });

substituteRequestsRouter.get("/", authenticate, requireStoreRole(["OWNER", "WORKER"]), listSubstituteRequestsController);
substituteRequestsRouter.post("/", authenticate, requireStoreRole(["WORKER"]), createSubstituteRequestController);
