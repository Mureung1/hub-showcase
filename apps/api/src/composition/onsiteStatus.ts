import { databasePool } from "../db/pool.js";
import { PgTransactionManager } from "../db/transactionManager.js";
import { PgDailyQueueRepository } from "../repositories/pg/pgDailyQueueRepository.js";
import { PgHospitalRepository } from "../repositories/pg/pgHospitalRepository.js";
import { PgPatientCategoryRepository } from "../repositories/pg/pgPatientCategoryRepository.js";
import { PgWaitingRepository } from "../repositories/pg/pgWaitingRepository.js";
import { OnsiteStatusService } from "../services/onsiteStatusService.js";

export function createOnsiteStatusService(): OnsiteStatusService {
  return new OnsiteStatusService(
    new PgTransactionManager(databasePool),
    new PgWaitingRepository(),
    new PgDailyQueueRepository(),
    new PgPatientCategoryRepository(),
    new PgHospitalRepository(),
  );
}
