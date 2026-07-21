import { databasePool } from "../db/pool.js";
import { PgTransactionManager } from "../db/transactionManager.js";
import { MockNotificationProvider } from "../notifications/mockNotificationProvider.js";
import { PgNotificationRepository } from "../repositories/pg/pgNotificationRepository.js";
import { PgWaitingEventRepository } from "../repositories/pg/pgWaitingEventRepository.js";
import { PgWaitingExpirationRepository } from "../repositories/pg/pgWaitingExpirationRepository.js";
import { PgWaitingRepository } from "../repositories/pg/pgWaitingRepository.js";
import { NotificationService } from "../services/notificationService.js";
import { WaitingExpirationService } from "../services/waitingExpirationService.js";

export function createWaitingExpirationService(): WaitingExpirationService {
  return new WaitingExpirationService(
    new PgTransactionManager(databasePool),
    new PgWaitingExpirationRepository(),
    new PgWaitingRepository(),
    new PgWaitingEventRepository(),
    new NotificationService(new PgNotificationRepository(), new MockNotificationProvider()),
  );
}
