import type {
  NotificationTemplateCode,
  NotificationTemplateVariables,
} from "@baro-jinryo/shared";
import type { NotificationProviderName } from "../repositories/notificationRepository.js";

export interface NotificationSendRequest {
  recipientPhone: string;
  templateCode: NotificationTemplateCode;
  variables: NotificationTemplateVariables;
}

export type NotificationSendResult =
  | {
      ok: true;
      provider: NotificationProviderName;
      providerMessageId: string;
    }
  | {
      ok: false;
      provider: NotificationProviderName;
      errorCode: string;
    };

export interface NotificationProvider {
  readonly name: NotificationProviderName;
  send(request: NotificationSendRequest): Promise<NotificationSendResult>;
}
