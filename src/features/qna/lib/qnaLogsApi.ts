import { supabase } from '../../../lib/supabase'
import type { ChatMessage } from '../types'

export async function saveQnaLog(question: string, answer: string, screenContext: string) {
  const { data } = await supabase.auth.getUser()
  const user = data.user
  if (!user) return

  await supabase.from('qna_logs').insert({
    user_id: user.id,
    question,
    answer,
    screen_context: screenContext,
  })
}

export async function loadRecentQnaLogs(limit = 20): Promise<ChatMessage[]> {
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) return []

  const { data, error } = await supabase
    .from('qna_logs')
    .select('question, answer, created_at')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error || !data) return []

  return [...data]
    .reverse()
    .flatMap((row): ChatMessage[] => [
      { role: 'user', text: row.question },
      { role: 'ai', text: row.answer },
    ])
}
