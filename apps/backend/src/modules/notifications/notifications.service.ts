import { HttpError } from "../../common/errors/HttpError";
import {
  findNotificationsByUserId,
  insertNotifications,
  markNotificationReadById
} from "./notifications.repository";
import {
  CreateNotificationInput,
  MarkNotificationAsReadInput,
  NotificationRecord,
  NotificationResponse
} from "./notifications.types";

function toNotificationResponse(notification: NotificationRecord): NotificationResponse {
  return {
    id: notification.id,
    userId: notification.user_id,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    readAt: notification.read_at,
    createdAt: notification.created_at
  };
}

function uniqueNotifications(inputs: CreateNotificationInput[]) {
  const keys = new Set<string>();

  return inputs.filter((input) => {
    const key = `${input.userId}:${input.type}:${input.title}:${input.message}`;

    if (keys.has(key)) {
      return false;
    }

    keys.add(key);
    return true;
  });
}

export async function listUserNotifications(userId: string) {
  const notifications = await findNotificationsByUserId(userId);

  return {
    notifications: notifications.map(toNotificationResponse)
  };
}

export async function createNotifications(inputs: CreateNotificationInput[]) {
  const notifications = await insertNotifications(uniqueNotifications(inputs));

  return notifications.map(toNotificationResponse);
}

export async function markNotificationAsRead(input: MarkNotificationAsReadInput) {
  const notification = await markNotificationReadById(input.notificationId, input.userId);

  if (!notification) {
    throw new HttpError(404, "알림을 찾을 수 없습니다.", "NOTIFICATION_NOT_FOUND");
  }

  return {
    notification: toNotificationResponse(notification)
  };
}
