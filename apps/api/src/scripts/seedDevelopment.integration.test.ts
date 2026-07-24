import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { databasePool } from "../db/pool.js";
import { PgTransactionManager } from "../db/transactionManager.js";

const hospitalId = "10000000-0000-4000-8000-000000000001";
const accountIds = [
  "20000000-0000-4000-8000-000000000001",
  "20000000-0000-4000-8000-000000000002",
];

describe("supabase/seed.sql", () => {
  it("개발 계정·승인 병원·통합 대기열·세 팀을 재현하고 롤백한다", async () => {
    const seedSql = await readFile(
      new URL("../../../../supabase/seed.sql", import.meta.url),
      "utf8",
    );
    const transactionManager = new PgTransactionManager(databasePool);

    await expect(
      transactionManager.run(async (executor) => {
        const cleanupStatements = [
          `DELETE FROM public.notification_logs WHERE waiting_entry_id IN (
              SELECT waiting.id FROM public.waiting_entries waiting
              JOIN public.daily_queues queue ON queue.id = waiting.queue_id
              WHERE queue.hospital_id = $1
            )`,
          `DELETE FROM public.waiting_events WHERE waiting_entry_id IN (
              SELECT waiting.id FROM public.waiting_entries waiting
              JOIN public.daily_queues queue ON queue.id = waiting.queue_id
              WHERE queue.hospital_id = $1
            )`,
          `DELETE FROM public.waiting_entry_counts WHERE waiting_entry_id IN (
              SELECT waiting.id FROM public.waiting_entries waiting
              JOIN public.daily_queues queue ON queue.id = waiting.queue_id
              WHERE queue.hospital_id = $1
            )`,
          `DELETE FROM public.waiting_entries WHERE queue_id IN (
              SELECT id FROM public.daily_queues WHERE hospital_id = $1
            )`,
          "DELETE FROM public.daily_queues WHERE hospital_id = $1",
          `DELETE FROM public.patient_categories WHERE category_set_id IN (
              SELECT id FROM public.patient_category_sets WHERE hospital_id = $1
            )`,
          "DELETE FROM public.patient_category_sets WHERE hospital_id = $1",
          `DELETE FROM public.hospital_documents WHERE application_id IN (
              SELECT id FROM public.hospital_applications WHERE hospital_id = $1
            )`,
          "DELETE FROM public.hospital_applications WHERE hospital_id = $1",
          "DELETE FROM public.hospital_change_requests WHERE hospital_id = $1",
          "DELETE FROM public.hospital_inquiries WHERE hospital_id = $1 OR applicant_account_id = ANY($2::uuid[])",
          "DELETE FROM public.hospital_members WHERE hospital_id = $1",
          "DELETE FROM public.hospitals WHERE id = $1",
          "DELETE FROM public.profiles WHERE id = ANY($1::uuid[])",
          "DELETE FROM auth.identities WHERE user_id = ANY($1::uuid[])",
          "DELETE FROM auth.users WHERE id = ANY($1::uuid[])",
        ];
        for (const statement of cleanupStatements) {
          const parameters = statement.includes("$2")
            ? [hospitalId, accountIds]
            : statement.includes("ANY($1")
              ? [accountIds]
              : [hospitalId];
          await executor.query(statement, parameters);
        }

        await executor.query(seedSql);

        const profiles = await executor.query<{ account_type: string }>(
          "SELECT account_type FROM public.profiles WHERE id = ANY($1::uuid[]) ORDER BY account_type",
          [accountIds],
        );
        expect(profiles.rows.map((row) => row.account_type)).toEqual([
          "hospital_admin",
          "patient",
        ]);

        const fixture = await executor.query<{
          approval_status: string;
          queue_status: string;
          waiting_count: string;
          patient_count: string;
        }>(
          `
            SELECT hospital.approval_status,
                   queue.status AS queue_status,
                   count(waiting.id)::text AS waiting_count,
                   sum(waiting.patient_count)::text AS patient_count
            FROM public.hospitals hospital
            JOIN public.daily_queues queue ON queue.hospital_id = hospital.id
            JOIN public.waiting_entries waiting ON waiting.queue_id = queue.id
            WHERE hospital.id = $1 AND queue.queue_date = current_date
            GROUP BY hospital.approval_status, queue.status
          `,
          [hospitalId],
        );
        expect(fixture.rows[0]).toEqual({
          approval_status: "approved",
          queue_status: "open",
          waiting_count: "3",
          patient_count: "7",
        });
        throw new Error("ROLLBACK_TEST");
      }),
    ).rejects.toThrow("ROLLBACK_TEST");
  });
});
