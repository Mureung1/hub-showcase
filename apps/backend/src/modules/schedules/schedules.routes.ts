import { Router } from "express";
import { authenticate } from "../../common/middlewares/authenticate";
import { requireStoreRole } from "../../common/middlewares/requireStoreRole";
import {
  createScheduleController,
  deleteScheduleController,
  listSchedulesByDateController,
  listSchedulesController,
  updateScheduleController
} from "./schedules.controller";

export const schedulesRouter = Router({ mergeParams: true });
export const scheduleItemRouter = Router();

schedulesRouter.get("/", authenticate, requireStoreRole(["OWNER", "WORKER"]), listSchedulesController);
schedulesRouter.post("/", authenticate, requireStoreRole(["OWNER"]), createScheduleController);
schedulesRouter.get("/:date", authenticate, requireStoreRole(["OWNER", "WORKER"]), listSchedulesByDateController);

scheduleItemRouter.patch("/:scheduleId", authenticate, updateScheduleController);
scheduleItemRouter.delete("/:scheduleId", authenticate, deleteScheduleController);
