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

export interface PatientCategoryRepository {
  findConfigurationById(
    executor: DatabaseExecutor,
    categorySetId: string,
  ): Promise<PatientCategoryConfiguration | null>;
}
