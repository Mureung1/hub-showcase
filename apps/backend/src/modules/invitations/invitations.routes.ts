import { Router } from "express";
import { authenticate } from "../../common/middlewares/authenticate";
import { requireStoreRole } from "../../common/middlewares/requireStoreRole";
import {
  acceptInvitationController,
  cancelInvitationController,
  createInvitationController,
  listPendingInvitationsController
} from "./invitations.controller";

export const storeInvitationsRouter = Router({ mergeParams: true });
export const invitationsRouter = Router();

storeInvitationsRouter.post("/", authenticate, requireStoreRole(["OWNER"]), createInvitationController);
storeInvitationsRouter.patch(
  "/:invitationId/cancel",
  authenticate,
  requireStoreRole(["OWNER"]),
  cancelInvitationController
);

invitationsRouter.get("/pending", authenticate, listPendingInvitationsController);
invitationsRouter.patch("/:invitationId/accept", authenticate, acceptInvitationController);
