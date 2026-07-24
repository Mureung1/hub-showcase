import { getSupabaseClient } from '../lib/supabase.js'
import { isDemoMode } from '../config/runtimeMode.js'
import { createSummary } from './summaryService.js'
import {
  createDemoCheckin,
  deleteDemoCheckin,
  getDemoCheckins,
} from './demoCheckinStore.js'

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
  if (isDemoMode()) {
    return getDemoCheckins()
  }

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

  if (isDemoMode()) {
    return createDemoCheckin({ ...entry, rawText, ...summary })
  }

  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('checkins')
    .insert({
      user_id: entry.userId || entry.user_id || null,
      raw_text: rawText,
      // 값이 있을 때만 컬럼을 포함한다 — DB 마이그레이션 전에도 기본 저장이 동작하도록
      ...(entry.mood ? { mood: entry.mood } : {}),
      ...(entry.imageUrl ? { image_url: entry.imageUrl } : {}),
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

export async function deleteCheckin(id) {
  if (isDemoMode()) {
    return deleteDemoCheckin(id)
  }

  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('checkins')
    .delete()
    .eq('id', id)
    .select()

  if (error) {
    const serviceError = new Error('기록을 삭제하지 못했습니다.')
    serviceError.status = 503
    serviceError.cause = error
    throw serviceError
  }

  if (data.length === 0) {
    const serviceError = new Error('삭제할 기록을 찾을 수 없습니다.')
    serviceError.status = 404
    throw serviceError
  }
}
