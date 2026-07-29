import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config({ quiet: true }); // quiet: 17.x부터 붙은 dotenvx/vestauth 홍보용 랜덤 tip 로그 억제

// 전부 optional인 이유: 이 앱은 외부 연동(Supabase/MAFRA/KAMIS/Clova)이 없어도 정적 폴백·데모
// 데이터로 계속 동작하도록 설계돼 있다(store.js, kamisClient.js, clovaOcr.js 참고). 여기서 검증하는
// 건 "값이 있다면 형식이 맞는지"이지 "반드시 있어야 하는지"가 아니다.
const schema = z.object({
  PORT: z.coerce.number().int().positive().default(3001),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_KEY: z.string().min(1).optional(),
  MAFRA_API_KEY: z.string().min(1).optional(),
  KAMIS_API_KEY: z.string().min(1).optional(),
  KAMIS_CERT_ID: z.string().min(1).optional(),
  CLOVA_OCR_INVOKE_URL: z.string().url().optional(),
  CLOVA_OCR_SECRET_KEY: z.string().min(1).optional(),
  AWS_REGION: z.string().min(1).default('ap-northeast-2'),
  AWS_ACCESS_KEY_ID: z.string().min(1).optional(),
  AWS_SECRET_ACCESS_KEY: z.string().min(1).optional(),
  VAPID_PUBLIC_KEY: z.string().min(1).optional(),
  VAPID_PRIVATE_KEY: z.string().min(1).optional(),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  // 형식이 잘못된 값(예: URL이 아닌 SUPABASE_URL)은 조용히 넘어가면 나중에 원인 찾기 어려운
  // 네트워크 에러로만 드러난다 — 여기서 바로 죽여서 .env를 고치게 한다.
  console.error('❌ .env 값 형식이 올바르지 않습니다:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

// 지금까지 각 모듈(supabaseClient.js, kamisClient.js, clovaOcr.js)이 키 없으면 개별적으로 조용히
// 폴백해서, "왜 정적값만 나오지?"를 매번 흩어진 코드에서 찾아야 했다 — 시작 로그 한 곳에 모은다.
const integrations = [
  ['Supabase (레시피 DB)', Boolean(env.SUPABASE_URL && env.SUPABASE_KEY)],
  ['MAFRA 레시피 API', Boolean(env.MAFRA_API_KEY)],
  ['KAMIS 가격 API', Boolean(env.KAMIS_API_KEY && env.KAMIS_CERT_ID)],
  ['Amazon Textract OCR', Boolean(env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY)],
  ['Clova OCR (Textract 미설정 시 대체)', Boolean(env.CLOVA_OCR_INVOKE_URL && env.CLOVA_OCR_SECRET_KEY)],
  ['Web Push (유통기한 알림)', Boolean(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY)],
];
for (const [name, on] of integrations) {
  console.log(`${on ? '✅' : '⬜'} ${name}${on ? '' : ' — 미설정, 정적/데모 폴백 사용'}`);
}
