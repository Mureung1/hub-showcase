import type {
  PatientCategoryDefinition,
  PatientInputMode,
} from "@baro-jinryo/shared";
import type { DatabaseExecutor } from "../db/databaseExecutor.js";

export interface PatientCategoryConfiguration {
  id: string;
  hospitalId: string;
  inputMode: PatientInputMode;
  categories: PatientCategoryDefinition[];
}

export interface SavePatientCategoryConfigurationInput {
  hospitalId: string;
  effectiveDate: string;
  inputMode: PatientInputMode;
  categories: PatientCategoryDefinition[];
}

export interface PatientCategoryRepository {
  findConfigurationById(
    executor: DatabaseExecutor,
    categorySetId: string,
  ): Promise<PatientCategoryConfiguration | null>;
  findEffectiveConfiguration(
    executor: DatabaseExecutor,
    hospitalId: string,
    effectiveDate: string,
  ): Promise<PatientCategoryConfiguration | null>;
  saveScheduledConfiguration(
    executor: DatabaseExecutor,
    input: SavePatientCategoryConfigurationInput,
  ): Promise<PatientCategoryConfiguration>;
}
