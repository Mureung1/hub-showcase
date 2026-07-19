import { getSupabaseClient } from '../lib/supabase.js'
import { createSummary } from './summaryService.js'

function toCheckin(row) {
  return {
    id: row.id,
    userId: row.user_id,
    rawText: row.raw_text,
    emotion: row.emotion,
    cause: row.cause,
    action: row.action,
    mood: row.mood,
    imageUrl: row.image_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function getCheckins() {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('checkins')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    const serviceError = new Error('저장된 기록을 불러오지 못했습니다.')
    serviceError.status = 503
    serviceError.cause = error
    throw serviceError
  }

  return data.map(toCheckin)
}

export async function createCheckin(entry) {
  const rawText = entry.rawText || entry.raw_text || entry.text
  const needsSummary = !entry.emotion || !entry.cause || !entry.action
  const generatedSummary = needsSummary ? await createSummary(rawText) : {}
  const summary = {
    emotion: entry.emotion || generatedSummary.emotion,
    cause: entry.cause || generatedSummary.cause,
    action: entry.action || generatedSummary.action,
  }
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('checkins')
    .insert({
      user_id: entry.userId || entry.user_id || null,
      raw_text: rawText,
      mood: entry.mood || null,
      image_url: entry.imageUrl || null,
      ...summary,
    })
    .select()
    .single()

  if (error) {
    const serviceError = new Error('기록을 저장하지 못했습니다.')
    serviceError.status = 503
    serviceError.cause = error
    throw serviceError
  }

  return toCheckin(data)
}
