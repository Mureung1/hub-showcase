import crypto from 'node:crypto'
import { getSupabaseClient } from '../lib/supabase.js'

const BUCKET = 'checkin-photos'

const EXT_BY_MIME = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

export async function uploadCheckinPhoto(file) {
  const supabase = getSupabaseClient()
  const ext = EXT_BY_MIME[file.mimetype] || 'bin'
  const path = `checkins/${Date.now()}-${crypto.randomUUID()}.${ext}`

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file.buffer, { contentType: file.mimetype })

  if (error) {
    const serviceError = new Error('사진을 업로드하지 못했습니다.')
    serviceError.status = 503
    serviceError.cause = error
    throw serviceError
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}
