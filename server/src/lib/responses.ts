import type { SupabaseClient } from '@supabase/supabase-js'

export type ResponseRow = {
  date: string
  time: string
  is_preferred: boolean
}

// claude: 참여자의 응답을 통째로 교체하는 작업을 DB(submit_response RPC)에 위임한다.
// 예전엔 라우터가 delete와 insert를 각각 호출했는데, 그 둘이 별개의 요청이라
// delete 성공 후 insert가 실패하면 기존 응답이 전부 사라진 채로 남았다(중간 상태).
// Postgres 함수는 호출 전체가 한 트랜잭션이라 실패 시 delete까지 롤백된다.
// 삭제된 예전 구현은 docs/rules/codeReview/past-notes.md 참고.
export async function replaceResponses(
  db: SupabaseClient,
  participantId: string,
  slots: ResponseRow[],
): Promise<boolean> {
  const { error } = await db.rpc('submit_response', {
    p_participant_id: participantId,
    p_slots: slots,
  })

  if (error) {
    console.error('submit_response rpc failed', error)
    return false
  }

  return true
}
