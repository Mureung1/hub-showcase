import { patientInputModeSchema } from "@baro-jinryo/shared";
import { z } from "zod";
import type { DatabaseExecutor } from "../../db/databaseExecutor.js";
import type {
  PatientCategoryConfiguration,
  PatientCategoryRepository,
  SavePatientCategoryConfigurationInput,
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

  async findEffectiveConfiguration(
    executor: DatabaseExecutor,
    hospitalId: string,
    effectiveDate: string,
  ): Promise<PatientCategoryConfiguration | null> {
    const result = await executor.query<{ id: string }>(
      `
        SELECT id
        FROM public.patient_category_sets
        WHERE hospital_id = $1
          AND effective_date <= $2
          AND status <> 'retired'
        ORDER BY effective_date DESC, created_at DESC
        LIMIT 1
      `,
      [hospitalId, effectiveDate],
    );
    const categorySetId = result.rows[0]?.id;
    return categorySetId
      ? this.findConfigurationById(executor, categorySetId)
      : null;
  }

  async saveScheduledConfiguration(
    executor: DatabaseExecutor,
    input: SavePatientCategoryConfigurationInput,
  ): Promise<PatientCategoryConfiguration> {
    await executor.query(
      "SELECT id FROM public.hospitals WHERE id = $1 FOR UPDATE",
      [input.hospitalId],
    );

    const scheduledResult = await executor.query<{ id: string }>(
      `
        SELECT id
        FROM public.patient_category_sets
        WHERE hospital_id = $1 AND status = 'scheduled'
        LIMIT 1
      `,
      [input.hospitalId],
    );
    const scheduledId = scheduledResult.rows[0]?.id;
    const categorySetResult = scheduledId
      ? await executor.query<{ id: string }>(
          `
            UPDATE public.patient_category_sets
            SET input_mode = $2, effective_date = $3
            WHERE id = $1
            RETURNING id
          `,
          [scheduledId, input.inputMode, input.effectiveDate],
        )
      : await executor.query<{ id: string }>(
          `
            INSERT INTO public.patient_category_sets
              (hospital_id, input_mode, effective_date, status)
            VALUES ($1, $2, $3, 'scheduled')
            RETURNING id
          `,
          [input.hospitalId, input.inputMode, input.effectiveDate],
        );
    const categorySetId = categorySetResult.rows[0]?.id;
    if (!categorySetId) throw new Error("Failed to save patient category configuration");

    await executor.query(
      "DELETE FROM public.patient_categories WHERE category_set_id = $1",
      [categorySetId],
    );
    for (const category of input.categories) {
      await executor.query(
        `
          INSERT INTO public.patient_categories
            (category_set_id, name, description, sort_order)
          VALUES ($1, $2, $3, $4)
        `,
        [categorySetId, category.name, category.description, category.sortOrder],
      );
    }

    const configuration = await this.findConfigurationById(executor, categorySetId);
    if (!configuration) throw new Error("Saved patient category configuration was not found");
    return configuration;
  }
}
