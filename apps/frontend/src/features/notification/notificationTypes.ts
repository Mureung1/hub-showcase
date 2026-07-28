export type NotificationType =
  | "SUBSTITUTE_REQUEST_CREATED"
  | "SUBSTITUTE_REQUEST_APPLIED"
  | "SUBSTITUTE_REQUEST_APPROVED"
  | "SUBSTITUTE_REQUEST_REJECTED";

export type NotificationItem = {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  readAt: string | null;
  createdAt: string;
};

export type NotificationsResponse = {
  notifications: NotificationItem[];
};

export type MarkNotificationAsReadResponse = {
  notification: NotificationItem;
};
