import { Request, Response } from "express";
import { z } from "zod";
import { listUserNotifications, markNotificationAsRead } from "./notifications.service";

const notificationIdSchema = z.string().uuid("알림 ID를 확인해주세요.");

function getStringParam(value: string | string[] | undefined) {
  if (!value || Array.isArray(value)) {
    return null;
  }

  return value;
}

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
    res.status(400).json({
      message: "알림 ID가 필요합니다."
    });
    return;
  }

  const notificationIdResult = notificationIdSchema.safeParse(notificationId);

  if (!notificationIdResult.success) {
    res.status(400).json({
      message: notificationIdResult.error.issues[0]?.message ?? "알림 ID를 확인해주세요."
    });
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
