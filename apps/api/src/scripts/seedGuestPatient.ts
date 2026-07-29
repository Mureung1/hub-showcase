import { closeDatabasePool, databasePool } from "../db/pool.js";
import { PgTransactionManager } from "../db/transactionManager.js";

const GUEST_ACCOUNT_ID = "20000000-0000-4000-8000-000000000004";
const GUEST_IDENTITY_ID = "21000000-0000-4000-8000-000000000004";
const GUEST_EMAIL = "guest@naver.com";
const GUEST_PHONE_NUMBER = "+821077778888";

function requireGuestPassword(): string {
  const password = process.env.DEVELOPMENT_GUEST_PASSWORD;
  if (!password || password.length < 8) {
    throw new Error("DEVELOPMENT_GUEST_PASSWORD는 8자 이상으로 설정해야 합니다.");
  }
  return password;
}

async function seedGuestPatient(): Promise<void> {
  if (process.env.NODE_ENV === "production") {
    throw new Error("production 환경에서는 게스트 개발 계정 seed를 실행할 수 없습니다.");
  }

  const password = requireGuestPassword();
  const transactionManager = new PgTransactionManager(databasePool);

  await transactionManager.run(async (executor) => {
    await executor.query(
      `
        INSERT INTO auth.users (
          instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
          confirmation_token, recovery_token, email_change_token_new, email_change,
          raw_app_meta_data, raw_user_meta_data, created_at, updated_at
        )
        VALUES (
          '00000000-0000-0000-0000-000000000000', $1, 'authenticated',
          'authenticated', $2, crypt($3, gen_salt('bf')), now(),
          '', '', '', '',
          '{"provider":"email","providers":["email"]}'::jsonb,
          jsonb_build_object(
            'account_type', 'patient',
            'phone_number', $4::text
          ),
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
      [GUEST_ACCOUNT_ID, GUEST_EMAIL, password, GUEST_PHONE_NUMBER],
    );

    await executor.query(
      `
        INSERT INTO auth.identities (
          id, user_id, provider_id, identity_data, provider,
          last_sign_in_at, created_at, updated_at
        )
        VALUES (
          $1::uuid, $2::uuid, $2::text,
          jsonb_build_object('sub', $2::text, 'email', $3::text),
          'email', now(), now(), now()
        )
        ON CONFLICT (provider_id, provider) DO UPDATE
        SET identity_data = EXCLUDED.identity_data,
            updated_at = now()
      `,
      [GUEST_IDENTITY_ID, GUEST_ACCOUNT_ID, GUEST_EMAIL],
    );

    await executor.query(
      `
        INSERT INTO public.profiles (id, phone_number, account_type, status)
        VALUES ($1, $2, 'patient', 'active')
        ON CONFLICT (id) DO UPDATE
        SET phone_number = EXCLUDED.phone_number,
            account_type = 'patient',
            status = 'active'
      `,
      [GUEST_ACCOUNT_ID, GUEST_PHONE_NUMBER],
    );
  });

  console.info(`[seed] ${GUEST_EMAIL} 게스트 환자 계정 준비 완료`);
}

try {
  await seedGuestPatient();
} finally {
  await closeDatabasePool();
}
