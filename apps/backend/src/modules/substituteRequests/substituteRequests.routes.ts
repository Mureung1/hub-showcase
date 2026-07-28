import { Router } from "express";
import { authenticate } from "../../common/middlewares/authenticate";
import { requireStoreRole } from "../../common/middlewares/requireStoreRole";
import {
  applySubstituteRequestController,
  approveSubstituteRequestController,
  createSubstituteRequestController,
  listSubstituteRequestsController,
  rejectSubstituteRequestController
} from "./substituteRequests.controller";

export const substituteRequestsRouter = Router({ mergeParams: true });
export const substituteRequestItemRouter = Router();

substituteRequestsRouter.get("/", authenticate, requireStoreRole(["OWNER", "WORKER"]), listSubstituteRequestsController);
substituteRequestsRouter.post("/", authenticate, requireStoreRole(["WORKER"]), createSubstituteRequestController);

substituteRequestItemRouter.patch("/:requestId/apply", authenticate, applySubstituteRequestController);
substituteRequestItemRouter.patch("/:requestId/approve", authenticate, approveSubstituteRequestController);
substituteRequestItemRouter.patch("/:requestId/reject", authenticate, rejectSubstituteRequestController);
