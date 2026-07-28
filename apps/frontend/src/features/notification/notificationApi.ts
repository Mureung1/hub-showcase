import { apiRequest } from "../../shared/api";
import {
  MarkNotificationAsReadResponse,
  NotificationsResponse
} from "./notificationTypes";

export async function getNotifications(accessToken: string) {
  return apiRequest<NotificationsResponse>("/notifications", {
    accessToken
  });
}

export async function markNotificationAsRead(accessToken: string, notificationId: string) {
  return apiRequest<MarkNotificationAsReadResponse>(`/notifications/${notificationId}/read`, {
    method: "PATCH",
    accessToken
  });
}
