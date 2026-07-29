// FR-15 — 리더보드 초기 데이터용 가상 유저 30명 시딩. 1회성 스크립트다.
//
// 사용법:
//   1) supabase/migrations/2026-07-29_xp-leaderboard.sql을 먼저 Supabase 대시보드에서 실행한다.
//   2) Supabase 대시보드 > Settings > API에서 service_role 키를 발급받아 .env에
//      SUPABASE_SERVICE_ROLE_KEY=... 로 채운다(VITE_ 접두사 절대 금지 — 브라우저에 노출되면 안 됨).
//   3) node scripts/seed-leaderboard-users.mjs 로 실행한다.
//
// 이미 만들어진 계정(로그인 ID 중복)이면 새 계정을 만드는 대신 total_xp만 최신 값으로 갱신하므로
// 여러 번 실행해도 안전하다(SEED_USERS 값을 바꾼 뒤 재실행하면 그대로 반영된다). 만들어진 계정은
// 실제 로그인 용도가 아니라(비밀번호는 무작위로 버려짐) 순수히 리더보드에 표시될 데이터일 뿐이다.
import 'dotenv/config'
import { randomUUID } from 'node:crypto'
import { loginIdToEmail } from '../src/lib/authId.js'
import { getSupabaseAdmin } from '../server/supabaseAdmin.js'

// 리텐션 강화 v5 — v4에서 최고 레벨을 7로 낮췄는데도(주간 XP 재조정 전 기준) 여전히 실유저 체감보다
// 높아 보인다는 피드백에 따라, 이번엔 전체 밴드를 레벨 2~10(1등 L10, 꼴찌 L2)으로 다시 낮췄다 —
// xpRequiredForLevel(level)=level*10, 레벨 L의 totalXp 구간은 [5*L*(L-1), 5*L*(L-1)+10*L-1]이다
// (L2:10~29, L3:30~59, L4:60~99, L5:100~149, L6:150~209, L7:210~279, L8:280~359, L9:360~449,
// L10:450~549). 분포(L10:2, L9:2, L8:3, L7:3, L6:4, L5:4, L4:5, L3:4, L2:3=30명)는 예전과 같은
// "위로 갈수록 좁아지는" 피라미드 모양을 유지했다.
//
// 참고: 같은 v5에서 주간 퀘스트 보상을 일간의 5배 스케일(25~150XP)로 올렸다(quests.js) — 하루
// 3개+주간 5개+올클리어 보너스를 꾸준히 채우면 하루 100XP 넘게도 쌓일 수 있어, 실제로 열심히 쓰는
// 유저는 1주일 안에 1등(520XP)도 넘어설 수 있다. "누구나 처음엔 비슷해 보인다"는 첫인상 효과일 뿐
// 영구적인 상한이 아니라는 점은 v4 때와 동일하다.
const SEED_USERS = [
  { loginId: 'mzseed01', nickname: '단짠주의보', totalXp: 520 },
  { loginId: 'mzseed02', nickname: '헬스가디언', totalXp: 470 },
  { loginId: 'mzseed03', nickname: '미라클모닝', totalXp: 430 },
  { loginId: 'mzseed04', nickname: '도전365', totalXp: 390 },
  { loginId: 'mzseed05', nickname: '새싹집사', totalXp: 350 },
  { loginId: 'mzseed06', nickname: '단백질러버', totalXp: 320 },
  { loginId: 'mzseed07', nickname: '나트륨헌터', totalXp: 290 },
  { loginId: 'mzseed08', nickname: '아침형인간', totalXp: 270 },
  { loginId: 'mzseed09', nickname: '야식금지', totalXp: 245 },
  { loginId: 'mzseed10', nickname: '물마시기왕', totalXp: 220 },
  { loginId: 'mzseed11', nickname: '균형왕', totalXp: 200 },
  { loginId: 'mzseed12', nickname: '채소덕후', totalXp: 185 },
  { loginId: 'mzseed13', nickname: '칼로리요정', totalXp: 170 },
  { loginId: 'mzseed14', nickname: '다이어터', totalXp: 155 },
  { loginId: 'mzseed15', nickname: '영양사지망생', totalXp: 145 },
  { loginId: 'mzseed16', nickname: '아점러', totalXp: 130 },
  { loginId: 'mzseed17', nickname: '저녁운동러', totalXp: 115 },
  { loginId: 'mzseed18', nickname: '오늘도완밥', totalXp: 102 },
  { loginId: 'mzseed19', nickname: '식단관리중', totalXp: 95 },
  { loginId: 'mzseed20', nickname: '비타민충전', totalXp: 85 },
  { loginId: 'mzseed21', nickname: '건강루틴', totalXp: 75 },
  { loginId: 'mzseed22', nickname: '저염생활', totalXp: 68 },
  { loginId: 'mzseed23', nickname: '규칙적인삶', totalXp: 61 },
  { loginId: 'mzseed24', nickname: '물좋아', totalXp: 55 },
  { loginId: 'mzseed25', nickname: '습관형성중', totalXp: 47 },
  { loginId: 'mzseed26', nickname: '오늘의목표', totalXp: 39 },
  { loginId: 'mzseed27', nickname: '세끼챙김이', totalXp: 32 },
  { loginId: 'mzseed28', nickname: '퀘스트헌터', totalXp: 27 },
  { loginId: 'mzseed29', nickname: '레벨업중', totalXp: 20 },
  { loginId: 'mzseed30', nickname: '꾸준함의힘', totalXp: 13 },
]

// 이미 만든 계정(로그인 ID 중복)도 그냥 건너뛰지 않고 total_xp를 새 값으로 갱신한다 — 예전엔
// "already registered" 에러를 받으면 곧장 return해버려 profiles.upsert(XP 갱신)까지 가지 못했다
// (재실행해도 XP가 절대 안 바뀌는 실제 버그였다). listUsers로 기존 uid를 찾아 이어서 진행한다.
async function findExistingUserId(admin, email) {
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (error) throw error
  return data.users.find((u) => u.email === email)?.id ?? null
}

// createUser는 "이미 등록됨" 상황을 { error } 반환이 아니라 예외를 던지는 방식으로 알린다(실측 —
// 이전 버전은 { data, error } 구조분해가 항상 성공한다고 가정해 이 예외가 seedOne 밖으로 그대로
// 빠져나가 findExistingUserId 폴백이 한 번도 실행되지 않는 실제 버그였다). try/catch로 감싸야 한다.
async function seedOne(admin, { loginId, nickname, totalXp }) {
  const email = loginIdToEmail(loginId)
  let userId
  let created = true
  try {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: randomUUID(), // 실사용 로그인 대상이 아님 — 아무도 모르는 무작위 비밀번호로 버려진다.
      email_confirm: true,
      user_metadata: { nickname, login_id: loginId },
    })
    if (error) throw error
    userId = data.user.id
  } catch (err) {
    // 실측: 에러 메시지가 "already been registered"라 "already registered"(공백 없는 연속 문구)
    // 정규식은 매칭에 실패한다 — code: 'email_exists'(GoTrueAdminApi가 실제로 주는 필드)를 우선
    // 확인하고, 혹시 다른 SDK 버전이라 code가 없는 경우를 대비해 느슨한 문구 매칭을 폴백으로 둔다.
    const alreadyExists = err.code === 'email_exists' || /already.*regist|already exists/i.test(err.message ?? '')
    if (!alreadyExists) throw err
    created = false
    userId = await findExistingUserId(admin, email)
    if (!userId) {
      console.warn(`이미 존재한다고 했지만 계정을 찾지 못함: ${loginId}`)
      return
    }
  }

  const { error: profileError } = await admin.from('profiles').upsert({ id: userId, nickname, total_xp: totalXp })
  if (profileError) throw profileError
  console.log(`${created ? '시딩' : '갱신'} 완료: ${loginId}(${nickname}) totalXp=${totalXp}`)
}

async function main() {
  const admin = getSupabaseAdmin()
  for (const user of SEED_USERS) {
    // 계정 생성 API를 순차 호출한다(병렬 호출 시 GoTrue rate limit에 걸릴 수 있음).
    // eslint-disable-next-line no-await-in-loop
    await seedOne(admin, user)
  }
  console.log('전체 완료.')
}

main().catch((err) => {
  console.error('시딩 실패:', err)
  process.exitCode = 1
})
