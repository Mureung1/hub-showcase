// FR-15 — 리더보드 초기 데이터용 가상 유저 30명 시딩. 1회성 스크립트다.
//
// 사용법:
//   1) supabase/migrations/2026-07-29_xp-leaderboard.sql을 먼저 Supabase 대시보드에서 실행한다.
//   2) Supabase 대시보드 > Settings > API에서 service_role 키를 발급받아 .env에
//      SUPABASE_SERVICE_ROLE_KEY=... 로 채운다(VITE_ 접두사 절대 금지 — 브라우저에 노출되면 안 됨).
//   3) node scripts/seed-leaderboard-users.mjs 로 실행한다.
//
// 이미 만들어진 계정(로그인 ID 중복)은 건너뛰므로 여러 번 실행해도 안전하다. 만들어진 계정은 실제
// 로그인 용도가 아니라(비밀번호는 무작위로 버려짐) 순수히 리더보드에 표시될 데이터일 뿐이다.
import 'dotenv/config'
import { randomUUID } from 'node:crypto'
import { loginIdToEmail } from '../src/lib/authId.js'
import { getSupabaseAdmin } from '../server/supabaseAdmin.js'

// 상위 4명은 실제 활동 유저(약 한 달간 매일 퀘스트를 챙긴 유저 가정 — 대략 1,400XP·Lv.17)보다 높게,
// 나머지 25명은 그보다 낮게 넓게 분산해 실유저가 대략 5등 근처에 오도록 설계했다(PRD FR-15 참고).
// 배포 후 실제 계정의 total_xp를 확인해 상위 4개 값만 조정하면 순위 위치를 미세조정할 수 있다.
const SEED_USERS = [
  { loginId: 'mzseed01', nickname: '단짠주의보', totalXp: 3200 },
  { loginId: 'mzseed02', nickname: '헬스가디언', totalXp: 2600 },
  { loginId: 'mzseed03', nickname: '미라클모닝', totalXp: 2100 },
  { loginId: 'mzseed04', nickname: '도전365', totalXp: 1750 },
  { loginId: 'mzseed05', nickname: '새싹집사', totalXp: 1200 },
  { loginId: 'mzseed06', nickname: '단백질러버', totalXp: 1050 },
  { loginId: 'mzseed07', nickname: '나트륨헌터', totalXp: 950 },
  { loginId: 'mzseed08', nickname: '아침형인간', totalXp: 850 },
  { loginId: 'mzseed09', nickname: '야식금지', totalXp: 760 },
  { loginId: 'mzseed10', nickname: '물마시기왕', totalXp: 680 },
  { loginId: 'mzseed11', nickname: '균형왕', totalXp: 610 },
  { loginId: 'mzseed12', nickname: '채소덕후', totalXp: 550 },
  { loginId: 'mzseed13', nickname: '칼로리요정', totalXp: 500 },
  { loginId: 'mzseed14', nickname: '다이어터', totalXp: 450 },
  { loginId: 'mzseed15', nickname: '영양사지망생', totalXp: 410 },
  { loginId: 'mzseed16', nickname: '아점러', totalXp: 370 },
  { loginId: 'mzseed17', nickname: '저녁운동러', totalXp: 340 },
  { loginId: 'mzseed18', nickname: '오늘도완밥', totalXp: 310 },
  { loginId: 'mzseed19', nickname: '식단관리중', totalXp: 280 },
  { loginId: 'mzseed20', nickname: '비타민충전', totalXp: 250 },
  { loginId: 'mzseed21', nickname: '건강루틴', totalXp: 225 },
  { loginId: 'mzseed22', nickname: '저염생활', totalXp: 200 },
  { loginId: 'mzseed23', nickname: '규칙적인삶', totalXp: 175 },
  { loginId: 'mzseed24', nickname: '물좋아', totalXp: 150 },
  { loginId: 'mzseed25', nickname: '습관형성중', totalXp: 130 },
  { loginId: 'mzseed26', nickname: '오늘의목표', totalXp: 110 },
  { loginId: 'mzseed27', nickname: '세끼챙김이', totalXp: 90 },
  { loginId: 'mzseed28', nickname: '퀘스트헌터', totalXp: 70 },
  { loginId: 'mzseed29', nickname: '레벨업중', totalXp: 50 },
  { loginId: 'mzseed30', nickname: '꾸준함의힘', totalXp: 25 },
]

async function seedOne(admin, { loginId, nickname, totalXp }) {
  const { data, error } = await admin.auth.admin.createUser({
    email: loginIdToEmail(loginId),
    password: randomUUID(), // 실사용 로그인 대상이 아님 — 아무도 모르는 무작위 비밀번호로 버려진다.
    email_confirm: true,
    user_metadata: { nickname, login_id: loginId },
  })

  if (error) {
    if (/already registered|already exists/i.test(error.message)) {
      console.log(`건너뜀(이미 존재): ${loginId}`)
      return
    }
    throw error
  }

  const { error: profileError } = await admin.from('profiles').upsert({ id: data.user.id, nickname, total_xp: totalXp })
  if (profileError) throw profileError
  console.log(`시딩 완료: ${loginId}(${nickname}) totalXp=${totalXp}`)
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
