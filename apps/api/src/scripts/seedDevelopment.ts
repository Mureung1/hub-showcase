import { env } from "../config/env.js";
import { closeDatabasePool, databasePool } from "../db/pool.js";
import { PgTransactionManager } from "../db/transactionManager.js";
import { getClinicDate } from "../utils/clinicDate.js";

const CATEGORY_SET_ID = "20000000-0000-4000-8000-000000000001";
const STAFF_ACCOUNT_ID = "20000000-0000-4000-8000-000000000002";
const PLATFORM_ACCOUNT_ID = "20000000-0000-4000-8000-000000000003";
const STAFF_IDENTITY_ID = "21000000-0000-4000-8000-000000000002";
const PLATFORM_IDENTITY_ID = "21000000-0000-4000-8000-000000000003";

async function seedDevelopment(): Promise<void> {
  if (process.env.NODE_ENV === "production") {
    throw new Error("production 환경에서는 개발 seed를 실행할 수 없습니다.");
  }

  const transactionManager = new PgTransactionManager(databasePool);
  await transactionManager.run(async (executor) => {
    await executor.query(
      `
        INSERT INTO auth.users (
          instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
          confirmation_token, recovery_token, email_change_token_new, email_change,
          raw_app_meta_data, raw_user_meta_data, created_at, updated_at
        )
        VALUES
          (
            '00000000-0000-0000-0000-000000000000', $1, 'authenticated',
            'authenticated', 'staff@baro-jinryo.local',
            crypt('Staff123!', gen_salt('bf')), now(),
            '', '', '', '',
            '{"provider":"email","providers":["email"]}'::jsonb,
            '{"account_type":"hospital_admin","phone_number":"+821033334444"}'::jsonb,
            now(), now()
          ),
          (
            '00000000-0000-0000-0000-000000000000', $2, 'authenticated',
            'authenticated', 'platform@baro-jinryo.local',
            crypt('Platform123!', gen_salt('bf')), now(),
            '', '', '', '',
            '{"provider":"email","providers":["email"]}'::jsonb,
            '{"account_type":"platform_admin","phone_number":"+821055556666"}'::jsonb,
            now(), now()
          )
        ON CONFLICT (id) DO UPDATE
        SET email = EXCLUDED.email,
            encrypted_password = EXCLUDED.encrypted_password,
            email_confirmed_at = EXCLUDED.email_confirmed_at,
            confirmation_token = '',
            recovery_token = '',
            email_change_token_new = '',
            email_change = '',
            raw_app_meta_data = EXCLUDED.raw_app_meta_data,
            raw_user_meta_data = EXCLUDED.raw_user_meta_data,
            updated_at = now()
      `,
      [STAFF_ACCOUNT_ID, PLATFORM_ACCOUNT_ID],
    );
    await executor.query(
      `
        INSERT INTO auth.identities (
          id, user_id, provider_id, identity_data, provider,
          last_sign_in_at, created_at, updated_at
        )
        VALUES
          (
            $1::uuid, $2::uuid, $2::text,
            jsonb_build_object('sub', $2::text, 'email', 'staff@baro-jinryo.local'),
            'email', now(), now(), now()
          ),
          (
            $3::uuid, $4::uuid, $4::text,
            jsonb_build_object('sub', $4::text, 'email', 'platform@baro-jinryo.local'),
            'email', now(), now(), now()
          )
        ON CONFLICT (provider_id, provider) DO UPDATE
        SET identity_data = EXCLUDED.identity_data,
            updated_at = now()
      `,
      [STAFF_IDENTITY_ID, STAFF_ACCOUNT_ID, PLATFORM_IDENTITY_ID, PLATFORM_ACCOUNT_ID],
    );
    await executor.query(
      `
        INSERT INTO public.profiles (id, phone_number, account_type, status)
        VALUES
          ($1, '+821033334444', 'hospital_admin', 'active'),
          ($2, '+821055556666', 'platform_admin', 'active')
        ON CONFLICT (id) DO UPDATE
        SET phone_number = EXCLUDED.phone_number,
            account_type = EXCLUDED.account_type,
            status = EXCLUDED.status
      `,
      [STAFF_ACCOUNT_ID, PLATFORM_ACCOUNT_ID],
    );
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
        INSERT INTO public.hospital_members (hospital_id, account_id, role, status)
        VALUES ($1, $2, 'owner', 'active')
        ON CONFLICT (hospital_id, account_id) DO UPDATE
        SET role = 'owner', status = 'active'
      `,
      [env.STAFF_HOSPITAL_ID, STAFF_ACCOUNT_ID],
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
  console.info(`[seed] ${getClinicDate()} 개발용 계정, 병원과 대기열 준비 완료`);
}

try {
  await seedDevelopment();
} finally {
  await closeDatabasePool();
}
