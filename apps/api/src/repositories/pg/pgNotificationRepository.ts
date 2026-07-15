import {
  notificationDeliveryStatusSchema,
  notificationTemplateCodes,
  notificationTypeSchema,
} from "@baro-jinryo/shared";
import { z } from "zod";
import type { DatabaseExecutor } from "../../db/databaseExecutor.js";
import type {
  CreatePendingNotificationInput,
  NotificationLog,
  NotificationRepository,
} from "../notificationRepository.js";

const notificationTemplateCodeSchema = z.enum(
  Object.values(notificationTemplateCodes),
);

const notificationLogRowSchema = z.object({
  id: z.uuid(),
  waiting_entry_id: z.uuid(),
  notification_type: notificationTypeSchema,
  provider: z.literal("mock_kakao"),
  delivery_status: notificationDeliveryStatusSchema,
  dedupe_key: z.string().min(1),
  template_code: notificationTemplateCodeSchema,
  provider_message_id: z.string().nullable(),
  payload: z.record(z.string(), z.unknown()),
  sent_at: z.date().nullable(),
  created_at: z.date(),
});

type NotificationLogRow = z.infer<typeof notificationLogRowSchema>;

const notificationLogColumns = `
  id, waiting_entry_id, notification_type, provider, delivery_status,
  dedupe_key, template_code, provider_message_id, payload, sent_at, created_at
`;

function toNotificationLog(row: unknown): NotificationLog {
  const log = notificationLogRowSchema.parse(row);
  return {
    id: log.id,
    waitingEntryId: log.waiting_entry_id,
    notificationType: log.notification_type,
    provider: log.provider,
    deliveryStatus: log.delivery_status,
    dedupeKey: log.dedupe_key,
    templateCode: log.template_code,
    providerMessageId: log.provider_message_id,
    payload: log.payload,
    sentAt: log.sent_at,
    createdAt: log.created_at,
  };
}

export class PgNotificationRepository implements NotificationRepository {
  async createPending(
    executor: DatabaseExecutor,
    input: CreatePendingNotificationInput,
  ): Promise<NotificationLog | null> {
    const result = await executor.query<NotificationLogRow>(
      `
        INSERT INTO public.notification_logs
          (waiting_entry_id, notification_type, provider, delivery_status,
           dedupe_key, template_code, payload)
        VALUES ($1, $2, $3, 'pending', $4, $5, $6)
        ON CONFLICT (waiting_entry_id, dedupe_key) DO NOTHING
        RETURNING ${notificationLogColumns}
      `,
      [
        input.waitingEntryId,
        input.notificationType,
        input.provider,
        input.dedupeKey,
        input.templateCode,
        input.variables,
      ],
    );
    const row = result.rows[0];
    return row ? toNotificationLog(row) : null;
  }

  async markSent(
    executor: DatabaseExecutor,
    notificationId: string,
    providerMessageId: string,
  ): Promise<NotificationLog> {
    return this.updateDelivery(executor, notificationId, "sent", providerMessageId, null);
  }

  async markFailed(
    executor: DatabaseExecutor,
    notificationId: string,
    errorCode: string,
  ): Promise<NotificationLog> {
    return this.updateDelivery(executor, notificationId, "failed", null, errorCode);
  }

  async listByWaitingEntry(
    executor: DatabaseExecutor,
    waitingEntryId: string,
  ): Promise<NotificationLog[]> {
    const result = await executor.query<NotificationLogRow>(
      `
        SELECT ${notificationLogColumns}
        FROM public.notification_logs
        WHERE waiting_entry_id = $1
        ORDER BY created_at ASC, id ASC
      `,
      [waitingEntryId],
    );
    return result.rows.map(toNotificationLog);
  }

  private async updateDelivery(
    executor: DatabaseExecutor,
    notificationId: string,
    deliveryStatus: "sent" | "failed",
    providerMessageId: string | null,
    errorCode: string | null,
  ): Promise<NotificationLog> {
    const result = await executor.query<NotificationLogRow>(
      `
        UPDATE public.notification_logs
        SET delivery_status = $2,
            provider_message_id = $3,
            payload = CASE
              WHEN $4::text IS NULL THEN payload
              ELSE payload || jsonb_build_object('deliveryErrorCode', $4::text)
            END,
            sent_at = now()
        WHERE id = $1 AND delivery_status = 'pending'
        RETURNING ${notificationLogColumns}
      `,
      [notificationId, deliveryStatus, providerMessageId, errorCode],
    );
    const row = result.rows[0];
    if (!row) throw new Error("처리 가능한 알림 로그를 찾을 수 없습니다.");
    return toNotificationLog(row);
  }
}
