import { env } from "../config/env.js";
import { databasePool } from "../db/pool.js";
import { PgTransactionManager } from "../db/transactionManager.js";
import { MockNotificationProvider } from "../notifications/mockNotificationProvider.js";
import { PgNotificationRepository } from "../repositories/pg/pgNotificationRepository.js";
import { PgWaitingEventRepository } from "../repositories/pg/pgWaitingEventRepository.js";
import { PgWaitingExpirationRepository } from "../repositories/pg/pgWaitingExpirationRepository.js";
import { PgWaitingRepository } from "../repositories/pg/pgWaitingRepository.js";
import { AutomaticNotificationService } from "../services/automaticNotificationService.js";
import { NotificationService } from "../services/notificationService.js";
import { WaitingExpirationService } from "../services/waitingExpirationService.js";

export function createWaitingExpirationService(): WaitingExpirationService {
  const waitingRepository = new PgWaitingRepository();
  const waitingEventRepository = new PgWaitingEventRepository();
  const notificationService = new NotificationService(
    new PgNotificationRepository(),
    new MockNotificationProvider(),
  );
  return new WaitingExpirationService(
    new PgTransactionManager(databasePool),
    new PgWaitingExpirationRepository(),
    waitingRepository,
    waitingEventRepository,
    notificationService,
    new AutomaticNotificationService(
      waitingRepository,
      waitingEventRepository,
      notificationService,
    ),
    { patientWebOrigin: env.PATIENT_WEB_ORIGIN },
  );
}
