import { Router } from "express";
import { authenticate } from "../../common/middlewares/authenticate";
import {
  listNotificationsController,
  markNotificationAsReadController
} from "./notifications.controller";

export const notificationsRouter = Router();

notificationsRouter.get("/", authenticate, listNotificationsController);
notificationsRouter.patch("/:notificationId/read", authenticate, markNotificationAsReadController);
