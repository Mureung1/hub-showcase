import { patientInputModeSchema } from "@baro-jinryo/shared";
import { z } from "zod";
import type { DatabaseExecutor } from "../../db/databaseExecutor.js";
import type {
  PatientCategoryConfiguration,
  PatientCategoryRepository,
} from "../patientCategoryRepository.js";

const configurationRowSchema = z.object({
  id: z.uuid(),
  hospital_id: z.uuid(),
  input_mode: patientInputModeSchema,
  categories: z.array(
    z.object({
      id: z.uuid(),
      name: z.string(),
      description: z.string(),
      sortOrder: z.number().int(),
    }),
  ),
});

export class PgPatientCategoryRepository implements PatientCategoryRepository {
  async findConfigurationById(
    executor: DatabaseExecutor,
    categorySetId: string,
  ): Promise<PatientCategoryConfiguration | null> {
    const result = await executor.query(
      `
        SELECT category_set.id,
               category_set.hospital_id,
               category_set.input_mode,
               COALESCE(
                 jsonb_agg(
                   jsonb_build_object(
                     'id', category.id,
                     'name', category.name,
                     'description', category.description,
                     'sortOrder', category.sort_order
                   ) ORDER BY category.sort_order
                 ) FILTER (WHERE category.id IS NOT NULL),
                 '[]'::jsonb
               ) AS categories
        FROM public.patient_category_sets AS category_set
        LEFT JOIN public.patient_categories AS category
          ON category.category_set_id = category_set.id
        WHERE category_set.id = $1
        GROUP BY category_set.id
      `,
      [categorySetId],
    );
    const row = result.rows[0];
    if (!row) return null;
    const configuration = configurationRowSchema.parse(row);
    return {
      id: configuration.id,
      hospitalId: configuration.hospital_id,
      inputMode: configuration.input_mode,
      categories: configuration.categories,
    };
  }
}
