import { randomUUID } from "node:crypto";
import type {
  NotificationProvider,
  NotificationSendRequest,
  NotificationSendResult,
} from "./notificationProvider.js";

export interface MockNotificationProviderOptions {
  shouldFail?: (request: NotificationSendRequest) => boolean;
}

export class MockNotificationProvider implements NotificationProvider {
  readonly name = "mock_kakao" as const;

  constructor(private readonly options: MockNotificationProviderOptions = {}) {}

  async send(request: NotificationSendRequest): Promise<NotificationSendResult> {
    if (this.options.shouldFail?.(request)) {
      return { ok: false, provider: this.name, errorCode: "MOCK_DELIVERY_FAILED" };
    }

    return {
      ok: true,
      provider: this.name,
      providerMessageId: `mock-${randomUUID()}`,
    };
  }
}
