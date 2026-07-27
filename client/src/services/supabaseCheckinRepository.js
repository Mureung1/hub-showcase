function toCheckin(row) {
  return {
    id: row.id,
    userId: row.user_id,
    clientRecordId: row.client_record_id,
    rawText: row.raw_text,
    emotion: row.emotion || '',
    cause: row.cause || '',
    action: row.action || '',
    mood: row.mood,
    imageUrl: row.image_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    storageMode: 'cloud',
  }
}

function toRow(entry, userId) {
  return {
    user_id: userId,
    client_record_id: entry.clientRecordId || null,
    raw_text: entry.rawText,
    emotion: entry.emotion || '',
    cause: entry.cause || '',
    action: entry.action || '',
    mood: entry.mood || null,
    image_url: entry.imageUrl || null,
    ...(entry.createdAt ? { created_at: entry.createdAt } : {}),
  }
}

function createRepositoryError(message, cause) {
  const error = new Error(message)
  error.cause = cause
  return error
}

export function createSupabaseCheckinRepository(supabaseClient) {
  async function getUserId() {
    if (!supabaseClient) {
      throw new Error('Supabase 공개 키 설정이 필요합니다.')
    }

    const { data, error } = await supabaseClient.auth.getUser()
    if (error || !data.user) {
      throw createRepositoryError('로그인이 필요합니다.', error)
    }

    return data.user.id
  }

  async function getCheckins() {
    const userId = await getUserId()
    const { data, error } = await supabaseClient
      .from('checkins')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      throw createRepositoryError('클라우드 기록을 불러오지 못했습니다.', error)
    }

    return data.map(toCheckin)
  }

  async function createCheckin(entry) {
    const userId = await getUserId()
    const { data, error } = await supabaseClient
      .from('checkins')
      .insert(toRow(entry, userId))
      .select()
      .single()

    if (error) {
      throw createRepositoryError('클라우드에 기록을 저장하지 못했습니다.', error)
    }

    return toCheckin(data)
  }

  async function deleteCheckin(id) {
    const userId = await getUserId()
    const { data, error } = await supabaseClient
      .from('checkins')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)
      .select('id')

    if (error) {
      throw createRepositoryError('클라우드 기록을 삭제하지 못했습니다.', error)
    }

    if (!data.length) {
      throw new Error('삭제할 기록을 찾지 못했습니다.')
    }
  }

  async function syncGuestCheckins(records) {
    if (!records.length) {
      return []
    }

    const userId = await getUserId()
    const rows = records.map((record) => toRow({
      ...record,
      clientRecordId: record.id,
      // 게스트 사진은 기기에만 유지한다.
      imageUrl: null,
    }, userId))

    const { data, error } = await supabaseClient
      .from('checkins')
      .upsert(rows, { onConflict: 'user_id,client_record_id' })
      .select()

    if (error) {
      throw createRepositoryError('게스트 기록을 복사하지 못했습니다.', error)
    }

    return data.map(toCheckin)
  }

  function clearCheckins() {
    throw new Error('클라우드 기록은 한 건씩 삭제해 주세요.')
  }

  return {
    getCheckins,
    createCheckin,
    deleteCheckin,
    syncGuestCheckins,
    clearCheckins,
  }
}
