import { SupabaseAuthVerifier } from "../auth/supabaseAuthVerifier.js";
import { env } from "../config/env.js";
import { databasePool } from "../db/pool.js";
import { PgTransactionManager } from "../db/transactionManager.js";
import { createRequireStaffContext } from "../middleware/requireStaffContext.js";
import { PgHospitalAccessRepository } from "../repositories/pg/pgHospitalAccessRepository.js";

export function createStaffAuthMiddleware() {
  return createRequireStaffContext(
    new SupabaseAuthVerifier(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY),
    new PgTransactionManager(databasePool),
    new PgHospitalAccessRepository(),
    {
      allowDevelopmentBypass: env.ALLOW_DEV_STAFF_AUTH_BYPASS,
      developmentHospitalId: env.STAFF_HOSPITAL_ID,
    },
  );
}
