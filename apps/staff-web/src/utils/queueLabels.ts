import type { StaffNotificationHistoryItem, WaitingStatus } from "@baro-jinryo/shared";

export const statusLabels: Record<WaitingStatus, string> = {
  remote_waiting: "원격 대기",
  entry_requested: "입장 요청",
  onsite_waiting: "현장 대기",
  held: "보류",
  called: "진료실 호출",
  cancelled: "취소",
};

export const notificationTypeLabels: Record<
  StaffNotificationHistoryItem["notificationType"],
  string
> = {
  remote_registered: "원격 접수 완료",
  onsite_registered: "현장 접수 완료",
  preparation: "방문 준비",
  entry_requested: "입장 요청",
  onsite_near_turn: "진료 임박",
  cancelled: "웨이팅 취소",
  called: "진료실 호출",
};

export const notificationDeliveryLabels: Record<
  StaffNotificationHistoryItem["deliveryStatus"],
  string
> = {
  pending: "발송 대기",
  sent: "발송 완료",
  failed: "발송 실패",
};
