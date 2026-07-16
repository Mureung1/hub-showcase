import { SupabaseAuthVerifier } from "../auth/supabaseAuthVerifier.js";
import { env } from "../config/env.js";
import { databasePool } from "../db/pool.js";
import { PgTransactionManager } from "../db/transactionManager.js";
import { createRequirePatientContext } from "../middleware/requirePatientContext.js";
import { PgProfileRepository } from "../repositories/pg/pgProfileRepository.js";

export function createPatientAuthMiddleware() {
  return createRequirePatientContext(
    new SupabaseAuthVerifier(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY),
    new PgTransactionManager(databasePool),
    new PgProfileRepository(),
  );
}
