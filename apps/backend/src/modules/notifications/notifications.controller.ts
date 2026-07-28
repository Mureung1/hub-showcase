import { Request, Response } from "express";
import { getStringParam, sendBadRequest, sendValidationError, uuidSchema } from "../../common/validation/requestValidation";
import { listUserNotifications, markNotificationAsRead } from "./notifications.service";

const notificationIdSchema = uuidSchema("알림 ID를 확인해주세요.");

export async function listNotificationsController(req: Request, res: Response) {
  if (!req.authUser) {
    res.status(401).json({
      message: "인증 정보가 없습니다."
    });
    return;
  }

  const response = await listUserNotifications(req.authUser.id);

  res.status(200).json(response);
}

export async function markNotificationAsReadController(req: Request, res: Response) {
  const notificationId = getStringParam(req.params.notificationId);

  if (!notificationId) {
    sendBadRequest(res, "알림 ID가 필요합니다.", "NOTIFICATION_ID_REQUIRED");
    return;
  }

  const notificationIdResult = notificationIdSchema.safeParse(notificationId);

  if (!notificationIdResult.success) {
    sendValidationError(res, notificationIdResult.error, "알림 ID를 확인해주세요.");
    return;
  }

  if (!req.authUser) {
    res.status(401).json({
      message: "인증 정보가 없습니다."
    });
    return;
  }

  const response = await markNotificationAsRead({
    notificationId: notificationIdResult.data,
    userId: req.authUser.id
  });

  res.status(200).json(response);
}
