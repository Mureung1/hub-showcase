import { env } from "../config/env.js";
import { databasePool } from "../db/pool.js";
import { PgTransactionManager } from "../db/transactionManager.js";
import { MockNotificationProvider } from "../notifications/mockNotificationProvider.js";
import { PgDailyQueueRepository } from "../repositories/pg/pgDailyQueueRepository.js";
import { PgHospitalRepository } from "../repositories/pg/pgHospitalRepository.js";
import { PgNotificationRepository } from "../repositories/pg/pgNotificationRepository.js";
import { PgPatientCategoryRepository } from "../repositories/pg/pgPatientCategoryRepository.js";
import { PgProfileRepository } from "../repositories/pg/pgProfileRepository.js";
import { PgWaitingEventRepository } from "../repositories/pg/pgWaitingEventRepository.js";
import { PgWaitingRepository } from "../repositories/pg/pgWaitingRepository.js";
import { NotificationService } from "../services/notificationService.js";
import { PatientWaitingService } from "../services/patientWaitingService.js";
import { getClinicDate } from "../utils/clinicDate.js";

export function createPatientWaitingService(): PatientWaitingService {
  return new PatientWaitingService(
    new PgTransactionManager(databasePool),
    new PgProfileRepository(),
    new PgHospitalRepository(),
    new PgDailyQueueRepository(),
    new PgPatientCategoryRepository(),
    new PgWaitingRepository(),
    new PgWaitingEventRepository(),
    new NotificationService(new PgNotificationRepository(), new MockNotificationProvider()),
    { patientWebOrigin: env.PATIENT_WEB_ORIGIN, getClinicDate },
  );
}
