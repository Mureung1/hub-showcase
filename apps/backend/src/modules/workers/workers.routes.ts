import { Router } from "express";
import { authenticate } from "../../common/middlewares/authenticate";
import { requireStoreRole } from "../../common/middlewares/requireStoreRole";
import { listWorkersController, updateWorkerController } from "./workers.controller";

export const workersRouter = Router({ mergeParams: true });

workersRouter.get("/", authenticate, requireStoreRole(["OWNER"]), listWorkersController);
workersRouter.patch("/:workerId", authenticate, requireStoreRole(["OWNER"]), updateWorkerController);
