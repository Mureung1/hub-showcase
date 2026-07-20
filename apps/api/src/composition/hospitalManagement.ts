import { SupabaseAuthVerifier } from "../auth/supabaseAuthVerifier.js";
import { env } from "../config/env.js";
import { databasePool } from "../db/pool.js";
import { PgTransactionManager } from "../db/transactionManager.js";
import { createRequirePlatformContext } from "../middleware/requirePlatformContext.js";
import { PgHospitalChangeRequestRepository } from "../repositories/pg/pgHospitalChangeRequestRepository.js";
import { PgHospitalRepository } from "../repositories/pg/pgHospitalRepository.js";
import { PgProfileRepository } from "../repositories/pg/pgProfileRepository.js";
import { HospitalManagementService } from "../services/hospitalManagementService.js";

export function createHospitalManagementService() {
  return new HospitalManagementService(
    new PgTransactionManager(databasePool),
    new PgHospitalRepository(),
    new PgHospitalChangeRequestRepository(),
  );
}

export function createPlatformAuthMiddleware() {
  return createRequirePlatformContext(
    new SupabaseAuthVerifier(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY),
    new PgTransactionManager(databasePool),
    new PgProfileRepository(),
  );
}
