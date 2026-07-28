// 인앱 알림 — 팀 이벤트를 각 팀원 개인(notifications 행)에게 팬아웃한다.
// activity_log(프로젝트 단위 피드)와 달리 수신자별 1행 + 읽음 상태를 가진다.
import { supabase } from '../db/supabase.js'

// 프로젝트 팀원(행위자 제외)에게 알림을 만든다.
// best-effort — 알림 실패가 본 작업(합류·배정·업로드 등)을 깨지 않도록 자체 흡수한다.
export async function notifyProjectMembers(projectId, { type, payload = {}, exceptUserId = null }) {
  try {
    const { data: members, error } = await supabase
      .from('project_members')
      .select('user_id')
      .eq('project_id', projectId)
    if (error) throw error

    const rows = (members ?? [])
      .map((m) => m.user_id)
      .filter((uid) => uid && uid !== exceptUserId)
      .map((user_id) => ({ user_id, project_id: projectId, type, payload }))
    if (rows.length > 0) {
      const { error: ei } = await supabase.from('notifications').insert(rows)
      if (ei) throw ei
    }
  } catch (e) {
    console.warn('[notify] 알림 생성 실패:', e.message)
  }
}
