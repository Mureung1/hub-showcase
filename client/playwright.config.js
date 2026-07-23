// @ts-check
import { defineConfig, devices } from '@playwright/test';
import { fileURLToPath } from 'url';
import path from 'path';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.resolve(__dirname, '.env.e2e') });

const REQUIRED_E2E_ENV_VARS = [
  'E2E_SUPABASE_URL',
  'E2E_SUPABASE_ANON_KEY',
  'E2E_SUPABASE_SERVICE_ROLE_KEY',
];
const missingEnvVars = REQUIRED_E2E_ENV_VARS.filter((key) => !process.env[key]);

if (missingEnvVars.length > 0) {
  // E2E는 실제로 회원가입/신청 등을 수행해 진짜 DB에 데이터를 만든다. dev/운영 Supabase에
  // 실수로 연결되는 걸 막기 위해, 테스트 전용 자격 증명이 없으면 서버조차 띄우지 않고 즉시 중단한다.
  throw new Error(
    `E2E 테스트를 실행하려면 client/.env.e2e에 다음 값이 필요합니다: ${missingEnvVars.join(', ')}\n` +
      'client/.env.e2e.example을 복사해서 dev/운영과는 별도인 테스트 전용 Supabase 프로젝트의 값을 채워주세요.',
  );
}

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e',
  // 시나리오가 회원가입→로그인→신청→수락→상태확인으로 이어지는 하나의 흐름이라 병렬 실행하지 않는다.
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // client(Vite)와 server(Express)를 둘 다 띄운 뒤 테스트를 시작한다.
  webServer: [
    {
      command: 'npm start',
      cwd: path.resolve(__dirname, '../server'),
      url: 'http://localhost:4000/api/health',
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
      env: {
        ...process.env,
        PORT: '4000',
        // server/.env(dev/운영용)가 있더라도, dotenv는 이미 설정된 값을 덮어쓰지 않으므로
        // 여기서 명시적으로 지정한 테스트 전용 Supabase 값이 항상 우선한다.
        SUPABASE_URL: process.env.E2E_SUPABASE_URL,
        SUPABASE_ANON_KEY: process.env.E2E_SUPABASE_ANON_KEY,
        SUPABASE_SERVICE_ROLE_KEY: process.env.E2E_SUPABASE_SERVICE_ROLE_KEY,
      },
    },
    {
      command: 'npm run dev',
      cwd: __dirname,
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
      env: { ...process.env },
    },
  ],
});
