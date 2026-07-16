import { SupabaseAuthVerifier } from "../auth/supabaseAuthVerifier.js";
import { env } from "../config/env.js";
import { databasePool } from "../db/pool.js";
import { PgTransactionManager } from "../db/transactionManager.js";
import { PgProfileRepository } from "../repositories/pg/pgProfileRepository.js";
import { PatientProfileService } from "../services/patientProfileService.js";

export function createPatientProfileDependencies() {
  return {
    authVerifier: new SupabaseAuthVerifier(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY),
    service: new PatientProfileService(
      new PgTransactionManager(databasePool),
      new PgProfileRepository(),
    ),
  };
}
