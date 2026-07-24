import { env } from "../config/env.js";
import { databasePool } from "../db/pool.js";
import { PgTransactionManager } from "../db/transactionManager.js";
import { MockNotificationProvider } from "../notifications/mockNotificationProvider.js";
import { PgDailyQueueRepository } from "../repositories/pg/pgDailyQueueRepository.js";
import { PgHospitalRepository } from "../repositories/pg/pgHospitalRepository.js";
import { PgNotificationRepository } from "../repositories/pg/pgNotificationRepository.js";
import { PgPatientCategoryRepository } from "../repositories/pg/pgPatientCategoryRepository.js";
import { PgWaitingEventRepository } from "../repositories/pg/pgWaitingEventRepository.js";
import { PgWaitingRepository } from "../repositories/pg/pgWaitingRepository.js";
import { NotificationService } from "../services/notificationService.js";
import { AutomaticNotificationService } from "../services/automaticNotificationService.js";
import { StaffQueueService } from "../services/staffQueueService.js";
import { getClinicDate } from "../utils/clinicDate.js";

export function createStaffQueueService(): StaffQueueService {
  const waitingRepository = new PgWaitingRepository();
  const waitingEventRepository = new PgWaitingEventRepository();
  const notificationRepository = new PgNotificationRepository();
  const notificationService = new NotificationService(
    notificationRepository,
    new MockNotificationProvider(),
  );
  return new StaffQueueService(
    new PgTransactionManager(databasePool),
    new PgDailyQueueRepository(),
    new PgHospitalRepository(),
    new PgPatientCategoryRepository(),
    waitingRepository,
    waitingEventRepository,
    notificationRepository,
    notificationService,
    new AutomaticNotificationService(
      waitingRepository,
      waitingEventRepository,
      notificationService,
    ),
    {
      patientWebOrigin: env.PATIENT_WEB_ORIGIN,
      getClinicDate,
    },
  );
}
