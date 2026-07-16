import { env } from "../config/env.js";
import { closeDatabasePool, databasePool } from "../db/pool.js";
import { PgTransactionManager } from "../db/transactionManager.js";
import { getClinicDate } from "../utils/clinicDate.js";

const CATEGORY_SET_ID = "20000000-0000-4000-8000-000000000001";

async function seedDevelopment(): Promise<void> {
  if (process.env.NODE_ENV === "production") {
    throw new Error("production 환경에서는 개발 seed를 실행할 수 없습니다.");
  }

  const transactionManager = new PgTransactionManager(databasePool);
  await transactionManager.run(async (executor) => {
    await executor.query(
      `
        INSERT INTO public.hospitals
          (id, name, primary_department, phone_number, region_sido,
           region_sigungu, address, operating_hours_text, approval_status, approved_at)
        VALUES
          ($1, '바로진료 개발 병원', '이비인후과', '+82212345678', '서울특별시',
           '마포구', '서울특별시 마포구 개발로 1', '평일 09:00-18:00', 'approved', now())
        ON CONFLICT (id) DO UPDATE
        SET name = EXCLUDED.name,
            approval_status = 'approved',
            approved_at = COALESCE(public.hospitals.approved_at, now())
      `,
      [env.STAFF_HOSPITAL_ID],
    );
    await executor.query(
      `
        INSERT INTO public.patient_category_sets
          (id, hospital_id, input_mode, effective_date, status)
        VALUES ($1, $2, 'total_only', $3, 'active')
        ON CONFLICT (id) DO UPDATE
        SET input_mode = 'total_only', status = 'active'
      `,
      [CATEGORY_SET_ID, env.STAFF_HOSPITAL_ID, getClinicDate()],
    );
    await executor.query(
      `
        INSERT INTO public.daily_queues
          (hospital_id, category_set_id, queue_date, status, opened_at)
        VALUES ($1, $2, $3, 'open', now())
        ON CONFLICT (hospital_id, queue_date) DO UPDATE
        SET category_set_id = EXCLUDED.category_set_id,
            status = 'open',
            opened_at = COALESCE(public.daily_queues.opened_at, now()),
            closed_at = NULL
      `,
      [env.STAFF_HOSPITAL_ID, CATEGORY_SET_ID, getClinicDate()],
    );
  });
  console.info(`[seed] ${getClinicDate()} 개발용 병원과 대기열 준비 완료`);
}

try {
  await seedDevelopment();
} finally {
  await closeDatabasePool();
}
