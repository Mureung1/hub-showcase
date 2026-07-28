export type NotificationType =
  | "SUBSTITUTE_REQUEST_CREATED"
  | "SUBSTITUTE_REQUEST_APPLIED"
  | "SUBSTITUTE_REQUEST_APPROVED"
  | "SUBSTITUTE_REQUEST_REJECTED";

export type NotificationRecord = {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  read_at: string | null;
  created_at: string;
};

export type NotificationResponse = {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  readAt: string | null;
  createdAt: string;
};

export type NotificationsResponse = {
  notifications: NotificationResponse[];
};

export type CreateNotificationInput = {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
};

export type MarkNotificationAsReadInput = {
  notificationId: string;
  userId: string;
};

export type MarkNotificationAsReadResponse = {
  notification: NotificationResponse;
};
