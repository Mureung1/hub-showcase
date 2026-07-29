// FR-21 — security_questions 테이블 접근(등록/조회/검증+비밀번호 변경). RLS가 이 테이블에 정책을
// 하나도 두지 않으므로(supabase/migrations/2026-07-29_security-questions.sql 참고) 여기서 쓰는
// getSupabaseAdmin()(SERVICE_ROLE_KEY)만이 유일한 접근 경로다.
import { getSupabaseAdmin } from '../supabaseAdmin.js'
import { hashSecurityAnswer, verifySecurityAnswer } from './securityAnswer.js'

// authId.js의 5회/1분 로그인 잠금보다 길게 잡는다 — 비밀번호 재설정은 뚫리면 계정 전체를 탈취당하는
// 더 무거운 동작이라, 무차별 대입의 비용을 더 크게 만든다.
const FAIL_LIMIT = 5
const LOCK_MS = 15 * 60 * 1000

// answer는 이미 normalizeSecurityAnswer(src/lib/securityQuestions.js)로 정규화된 값이어야 한다.
export async function registerSecurityQuestion({ userId, loginId, questionId, answer }) {
  const { hash, salt } = await hashSecurityAnswer(answer)
  const admin = getSupabaseAdmin()
  const { error } = await admin.from('security_questions').upsert(
    {
      user_id: userId,
      login_id: loginId,
      question_id: questionId,
      answer_hash: hash,
      answer_salt: salt,
      fail_count: 0,
      locked_until: null,
    },
    { onConflict: 'user_id' },
  )
  if (error) throw error
}

// 반환: { questionId } | null(등록된 계정이 없음)
export async function getSecurityQuestionByLoginId(loginId) {
  const admin = getSupabaseAdmin()
  const { data, error } = await admin.from('security_questions').select('question_id').eq('login_id', loginId).maybeSingle()
  if (error) throw error
  return data ? { questionId: data.question_id } : null
}

// 반환: 'ok' | 'wrong' | 'locked' | 'not_found'. answer는 이미 정규화된 값이어야 한다.
export async function verifyAndResetPassword({ loginId, answer, newPassword }) {
  const admin = getSupabaseAdmin()
  const { data: row, error } = await admin.from('security_questions').select('*').eq('login_id', loginId).maybeSingle()
  if (error) throw error
  if (!row) return 'not_found'

  if (row.locked_until && new Date(row.locked_until).getTime() > Date.now()) {
    return 'locked'
  }

  const correct = await verifySecurityAnswer(answer, row.answer_salt, row.answer_hash)
  if (!correct) {
    const nextFailCount = row.fail_count + 1
    const lockedNow = nextFailCount >= FAIL_LIMIT
    await admin
      .from('security_questions')
      .update({
        fail_count: lockedNow ? 0 : nextFailCount,
        locked_until: lockedNow ? new Date(Date.now() + LOCK_MS).toISOString() : null,
      })
      .eq('user_id', row.user_id)
    return lockedNow ? 'locked' : 'wrong'
  }

  await admin.from('security_questions').update({ fail_count: 0, locked_until: null }).eq('user_id', row.user_id)

  const { error: updateError } = await admin.auth.admin.updateUserById(row.user_id, { password: newPassword })
  if (updateError) throw updateError
  return 'ok'
}
