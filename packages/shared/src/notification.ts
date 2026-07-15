import type { NotificationType } from "./domain.js";

export const notificationTemplateCodes = {
  remote_registered: "BJ_REMOTE_REGISTERED",
  onsite_registered: "BJ_ONSITE_REGISTERED",
  preparation: "BJ_PREPARATION",
  entry_requested: "BJ_ENTRY_REQUESTED",
  onsite_near_turn: "BJ_ONSITE_NEAR_TURN",
  cancelled: "BJ_CANCELLED",
  called: "BJ_CALLED",
} as const satisfies Record<NotificationType, string>;

export type NotificationTemplateCode =
  (typeof notificationTemplateCodes)[NotificationType];

export type NotificationTemplateValue = string | number | boolean;
export type NotificationTemplateVariables = Record<
  string,
  NotificationTemplateValue
>;

export const notificationTemplateVariableNames = {
  remote_registered: ["hospitalName", "ticketNumber", "statusUrl"],
  onsite_registered: ["hospitalName", "ticketNumber", "statusUrl"],
  preparation: ["hospitalName", "currentPosition", "estimatedMinutes", "statusUrl"],
  entry_requested: [
    "hospitalName",
    "currentPosition",
    "arrivalGraceMinutes",
    "statusUrl",
  ],
  onsite_near_turn: ["hospitalName", "currentPosition", "statusUrl"],
  cancelled: ["hospitalName", "ticketNumber"],
  called: ["hospitalName", "ticketNumber"],
} as const satisfies Record<NotificationType, readonly string[]>;
