import { Router } from "express";
import { authenticate } from "../../common/middlewares/authenticate";
import { requireStoreRole } from "../../common/middlewares/requireStoreRole";
import { listSchedulesByDateController, listSchedulesController } from "./schedules.controller";

export const schedulesRouter = Router({ mergeParams: true });

schedulesRouter.get("/", authenticate, requireStoreRole(["OWNER", "WORKER"]), listSchedulesController);
schedulesRouter.get("/:date", authenticate, requireStoreRole(["OWNER", "WORKER"]), listSchedulesByDateController);
