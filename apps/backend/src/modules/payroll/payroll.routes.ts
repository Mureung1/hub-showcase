import { Router } from "express";
import { authenticate } from "../../common/middlewares/authenticate";
import { requireStoreRole } from "../../common/middlewares/requireStoreRole";
import { getPayrollSummaryController } from "./payroll.controller";

export const payrollRouter = Router({ mergeParams: true });

payrollRouter.get("/summary", authenticate, requireStoreRole(["OWNER", "WORKER"]), getPayrollSummaryController);
