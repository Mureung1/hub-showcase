import { Router } from 'express'
import { randomUUID } from 'crypto'
import { supabase } from '../supabaseClient.js'
import {
  passesGenderFilter,
  sortByArrivalPriority,
  describeActivity,
  classifyBoarding,
  isRoomStale,
  isOverdueForAutoRating,
  applyRating,
} from '../matching.js'

const router = Router()

// 동행자 한 명에게 평점을 기록하고, 그 사람의 프로필 평점에 반영 (그룹원 각각 개별 평가)
async function applyRatingSubmission(requestId, targetRequestId, stars, noshowReported) {
  const { data: rater, error: raterError } = await supabase
    .from('matching_requests')
    .select('group_id')
    .eq('id', requestId)
    .single()

  if (raterError) {
    return { error: raterError.message }
  }

  const { data: target, error: targetError } = await supabase
    .from('matching_requests')
    .select('user_id')
    .eq('id', targetRequestId)
    .single()

  if (targetError || !target?.user_id) {
    return { error: targetError?.message ?? '동행자를 찾을 수 없어요' }
  }

  // 노쇼 신고면 실제 입력한 별점 대신 1점으로 강제 반영
  const effectiveStars = noshowReported ? 1 : stars

  const { data: rating, error: insertError } = await supabase
    .from('ratings')
    .insert({
      request_id: requestId,
      target_request_id: targetRequestId,
      group_id: rater.group_id,
      stars,
      noshow_reported: !!noshowReported,
    })
    .select()
    .single()

  if (insertError) {
    return { error: insertError.message }
  }

  const { data: user } = await supabase
    .from('users')
    .select('rating, rating_count, noshow_count')
    .eq('id', target.user_id)
    .single()

  if (user) {
    const { rating: newRating, count: newCount } = applyRating(user.rating, user.rating_count, effectiveStars)

    await supabase
      .from('users')
      .update({
        rating: newRating,
        rating_count: newCount,
        noshow_count: noshowReported ? (user.noshow_count ?? 0) + 1 : user.noshow_count,
      })
      .eq('id', target.user_id)
  }

  return { rating }
}

// 탑승 후 1시간 넘게 평가가 없는 트립은 불만 없음으로 보고, 그룹원 각각에게 자동 5점 처리
async function sweepAutoRatings() {
  const { data: boarded } = await supabase
    .from('matching_requests')
    .select('id, group_id, boarded_at')
    .not('boarded_at', 'is', null)

  const overdue = (boarded ?? []).filter((r) => isOverdueForAutoRating(r.boarded_at))
  if (overdue.length === 0) return

  const ids = overdue.map((r) => r.id)
  const { data: existingRatings } = await supabase.from('ratings').select('request_id').in('request_id', ids)
  const ratedIds = new Set((existingRatings ?? []).map((r) => r.request_id))

  for (const row of overdue) {
    if (ratedIds.has(row.id) || !row.group_id) continue

    const { data: companions } = await supabase
      .from('matching_requests')
      .select('id')
      .eq('group_id', row.group_id)
      .neq('id', row.id)

    for (const companion of companions ?? []) {
      await applyRatingSubmission(row.id, companion.id, 5, false)
    }
  }
}

function timeWindow(time, minutes) {
  const [h, m] = time.split(':').map(Number)
  const total = h * 60 + m
  const toTimeString = (t) => {
    const clamped = ((t % 1440) + 1440) % 1440
    const hh = String(Math.floor(clamped / 60)).padStart(2, '0')
    const mm = String(clamped % 60).padStart(2, '0')
    return `${hh}:${mm}:00`
  }
  return [toTimeString(total - minutes), toTimeString(total + minutes)]
}

router.post('/', async (req, res) => {
  const { direction, departureHub, destHub, time, arrival, genderOnly, userId } = req.body

  const { data: hubs, error: hubError } = await supabase
    .from('hubs')
    .select('id, name')
    .in('name', [departureHub, destHub])

  if (hubError) {
    return res.status(500).json({ error: hubError.message })
  }

  const departureHubId = hubs.find((h) => h.name === departureHub)?.id ?? null
  const destinationHubId = hubs.find((h) => h.name === destHub)?.id ?? null

  if (!departureHubId || !destinationHubId) {
    return res.status(400).json({ error: '알 수 없는 거점 이름입니다' })
  }

  const { data, error } = await supabase
    .from('matching_requests')
    .insert({
      direction,
      departure_hub_id: departureHubId,
      destination_hub_id: destinationHubId,
      desired_time: time,
      arrival_estimate: arrival,
      gender_only: genderOnly,
      user_id: userId ?? null,
    })
    .select()
    .single()

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  res.status(201).json(data)
})

router.get('/', async (req, res) => {
  await sweepAutoRatings()

  const { departureHub, destHub, time } = req.query

  let query = supabase
    .from('matching_requests')
    .select('*')
    .order('desired_time', { ascending: true })

  if (departureHub && destHub && time) {
    const { data: hubs, error: hubError } = await supabase
      .from('hubs')
      .select('id, name')
      .in('name', [departureHub, destHub])

    if (hubError) {
      return res.status(500).json({ error: hubError.message })
    }

    const departureHubId = hubs.find((h) => h.name === departureHub)?.id ?? null
    const destinationHubId = hubs.find((h) => h.name === destHub)?.id ?? null

    if (!departureHubId || !destinationHubId) {
      return res.status(400).json({ error: '알 수 없는 거점 이름입니다' })
    }

    const [lower, upper] = timeWindow(time, 10)

    query = query
      .eq('departure_hub_id', departureHubId)
      .eq('destination_hub_id', destinationHubId)
      .in('status', ['open', 'matched'])
      .gte('desired_time', lower)
      .lte('desired_time', upper)
  }

  const { data, error } = await query

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  const hubIds = [...new Set(data.flatMap((r) => [r.departure_hub_id, r.destination_hub_id]).filter(Boolean))]
  const { data: hubRows } = await supabase.from('hubs').select('id, name').in('id', hubIds.length ? hubIds : [''])
  const hubNameById = Object.fromEntries((hubRows ?? []).map((h) => [h.id, h.name]))

  const withHubNames = data.map((r) => ({
    ...r,
    departure_hub_name: hubNameById[r.departure_hub_id] ?? null,
    destination_hub_name: hubNameById[r.destination_hub_id] ?? null,
  }))

  // 같은 group_id끼리는 "이미 모인 방"으로 묶는다. group_id가 없는 요청은 아직 방을 안 만든 상태라 후보로 안 보여줌.
  const roomsByKey = new Map()
  for (const row of withHubNames) {
    if (!row.group_id) continue
    const key = row.group_id
    if (!roomsByKey.has(key)) {
      roomsByKey.set(key, { representative: row, memberIds: [] })
    }
    roomsByKey.get(key).memberIds.push(row.id)
  }

  const boardedAtByRequestId = Object.fromEntries(data.map((r) => [r.id, r.boarded_at]))

  const rooms = [...roomsByKey.values()]
    .map(({ representative, memberIds }) => ({
      ...representative,
      groupCount: memberIds.length,
      memberIds,
    }))
    .filter((room) => room.groupCount < 4)
    // 마지막 활동(하트비트)이 오래된 방은 후보 목록에서 제외 (방장이 떠나고 안 돌아온 방 정리)
    .filter((room) => !isRoomStale(room.last_seen_at))
    // 이미 탑승(출발)한 방은 더 이상 참여할 수 없으므로 후보 목록에서 제외
    .filter((room) => !room.memberIds.some((id) => boardedAtByRequestId[id]))

  const { myRequestId } = req.query
  const me = myRequestId ? data.find((r) => r.id === myRequestId) : null

  // 요청 id로 user_id를 찾기 위한 매핑 (방 대표자뿐 아니라 방 전체 멤버의 평점을 평균낼 때 씀)
  const userIdByRequestId = Object.fromEntries(data.map((r) => [r.id, r.user_id]))

  // 각 방 대표자의 프로필(이름/단과대/사진)과 성별, 그리고 방 전체 멤버의 평점을 users 테이블에서 한 번에 조회
  const allMemberUserIds = rooms.flatMap((r) => r.memberIds.map((id) => userIdByRequestId[id]))
  const userIds = [...new Set([me?.user_id, ...rooms.map((r) => r.user_id), ...allMemberUserIds].filter(Boolean))]
  const { data: userRows } = await supabase
    .from('users')
    .select('id, gender, name, nickname, college, avatar_url, rating, rating_count, noshow_count, hide_gender')
    .in('id', userIds.length ? userIds : [''])
  const genderById = Object.fromEntries((userRows ?? []).map((u) => [u.id, u.gender]))
  const userById = Object.fromEntries((userRows ?? []).map((u) => [u.id, u]))
  const profileById = Object.fromEntries(
    (userRows ?? []).map((u) => [
      u.id,
      {
        name: u.nickname || u.name,
        college: u.college,
        avatar_url: u.avatar_url,
        rating: u.rating,
        ratingCount: u.rating_count,
        noshow_count: u.noshow_count,
        // 성별 비공개 설정을 했으면 후보 목록에도 성별을 안 보여줌
        gender: u.hide_gender ? null : u.gender,
      },
    ])
  )

  const withExtras = (room) => {
    const profile = profileById[room.user_id] ?? null
    const members = room.memberIds.map((id) => userById[userIdByRequestId[id]]).filter(Boolean)
    // 실제로 평가받은 적이 있는 멤버만 가중 평균 (한 번도 평가 못 받은 사람의 기본값 5점이 평균을 왜곡하지 않도록)
    const totalCount = members.reduce((sum, u) => sum + (u.rating_count ?? 0), 0)
    const weightedSum = members.reduce((sum, u) => sum + u.rating * (u.rating_count ?? 0), 0)
    const groupRatingAvg = totalCount > 0 ? Math.round((weightedSum / totalCount) * 10) / 10 : null

    return {
      ...room,
      activity: describeActivity(room.last_seen_at),
      profile: profile
        ? { ...profile, rating: groupRatingAvg ?? profile.rating, ratingCount: totalCount }
        : null,
    }
  }

  // 대표자의 계정이 이미 삭제된(고아) 요청은 후보 목록에서 제외
  const validRooms = rooms.filter((room) => profileById[room.user_id])

  if (!me) {
    return res.json(validRooms.map(withExtras))
  }

  const myGenderInfo = { gender: genderById[me.user_id] ?? 'unknown', genderOnly: me.gender_only }

  const filteredRooms = validRooms.filter((room) => {
    const candidateGenderInfo = { gender: genderById[room.user_id] ?? 'unknown', genderOnly: room.gender_only }
    return passesGenderFilter(myGenderInfo, candidateGenderInfo)
  })

  res.json(filteredRooms.map(withExtras))
})

router.post('/:id/heartbeat', async (req, res) => {
  const { id } = req.params

  const { error } = await supabase
    .from('matching_requests')
    .update({ last_seen_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  res.json({ ok: true })
})

// 주의: '/:id'보다 먼저 등록해야 함. 안 그러면 'mine'이 :id로 잡혀버림
router.get('/mine/:userId', async (req, res) => {
  const { userId } = req.params

  const { data, error } = await supabase
    .from('matching_requests')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  if (!data) {
    return res.json(null)
  }

  const hubIds = [data.departure_hub_id, data.destination_hub_id].filter(Boolean)
  const { data: hubs } = await supabase.from('hubs').select('id, name').in('id', hubIds.length ? hubIds : [''])
  const hubNameById = Object.fromEntries((hubs ?? []).map((h) => [h.id, h.name]))

  res.json({
    ...data,
    departure_hub_name: hubNameById[data.departure_hub_id] ?? null,
    destination_hub_name: hubNameById[data.destination_hub_id] ?? null,
  })
})

router.get('/:id', async (req, res) => {
  const { id } = req.params

  const { data, error } = await supabase
    .from('matching_requests')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    return res.status(404).json({ error: '요청을 찾을 수 없어요' })
  }

  res.json(data)
})

router.post('/:id/create-room', async (req, res) => {
  const { id } = req.params
  const groupId = randomUUID()

  const { error } = await supabase
    .from('matching_requests')
    .update({ group_id: groupId, is_leader: true })
    .eq('id', id)

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  res.json({ groupId })
})

router.post('/:id/join', async (req, res) => {
  const { id } = req.params
  const { myRequestId } = req.body

  if (id === myRequestId) {
    return res.status(400).json({ error: '자기 자신의 요청에는 신청할 수 없어요' })
  }

  const { data: rows, error: fetchError } = await supabase
    .from('matching_requests')
    .select('*')
    .in('id', [id, myRequestId])

  if (fetchError) {
    return res.status(500).json({ error: fetchError.message })
  }

  const target = rows.find((r) => r.id === id)
  const mine = rows.find((r) => r.id === myRequestId)

  if (!target || !mine) {
    return res.status(404).json({ error: '요청을 찾을 수 없어요' })
  }

  if (mine.group_id) {
    return res.status(400).json({ error: '이미 다른 그룹에 참여했어요' })
  }

  const groupId = target.group_id ?? randomUUID()

  const { data: existingMembers, error: countError } = await supabase
    .from('matching_requests')
    .select('id, status')
    .eq('group_id', groupId)

  if (countError) {
    return res.status(500).json({ error: countError.message })
  }

  const matchedCount = existingMembers.filter((m) => m.status === 'matched').length

  if (matchedCount >= 4) {
    return res.status(400).json({ error: '정원이 다 찼어요' })
  }

  // 아직 matched된 사람이 아무도 없으면(방장이 혼자 만들어둔 방 포함) 첫 매칭으로 간주해 즉시 성사, 그 외엔 대기(pending)
  const isFirstJoin = matchedCount === 0
  const myStatus = isFirstJoin ? 'matched' : 'pending'

  const { error: updateMineError } = await supabase
    .from('matching_requests')
    .update({ group_id: groupId, status: myStatus })
    .eq('id', myRequestId)

  if (updateMineError) {
    return res.status(500).json({ error: updateMineError.message })
  }

  if (isFirstJoin) {
    const { error: updateTargetError } = await supabase
      .from('matching_requests')
      .update({ group_id: groupId, status: 'matched' })
      .eq('id', id)

    if (updateTargetError) {
      return res.status(500).json({ error: updateTargetError.message })
    }
  }

  const { data: members, error: membersError } = await supabase
    .from('matching_requests')
    .select('*')
    .eq('group_id', groupId)

  if (membersError) {
    return res.status(500).json({ error: membersError.message })
  }

  const matchedAfter = members.filter((m) => m.status === 'matched').length

  // 거의 동시에 여러 명이 첫 매칭을 시도하면 위 사전 체크만으로는 정원을 넘길 수 있어서,
  // 저장 직후 다시 세어보고 초과했으면 내 신청만 되돌린다.
  if (matchedAfter > 4) {
    await supabase
      .from('matching_requests')
      .update({ group_id: null, status: 'open' })
      .eq('id', myRequestId)

    return res.status(409).json({ error: '정원이 다 찼어요. 다른 후보를 확인해주세요.' })
  }

  res.json({ groupId, members, groupCount: matchedAfter, pending: myStatus === 'pending' })
})

router.get('/group/:groupId', async (req, res) => {
  const { groupId } = req.params

  const { data, error } = await supabase
    .from('matching_requests')
    .select('*')
    .eq('group_id', groupId)

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  // 대기(pending) 인원이 여러 명일 때, 도착 소요시간이 짧은 사람부터 보이도록 우선순위 정렬
  const sorted = sortByArrivalPriority(data)

  // 각 멤버의 프로필(닉네임/평점)을 users 테이블에서 한 번에 조회
  const memberUserIds = [...new Set(data.map((r) => r.user_id).filter(Boolean))]
  const { data: userRows } = await supabase
    .from('users')
    .select('id, name, nickname, avatar_url, rating, rating_count, noshow_count')
    .in('id', memberUserIds.length ? memberUserIds : [''])
  const profileById = Object.fromEntries(
    (userRows ?? []).map((u) => [
      u.id,
      { name: u.nickname || u.name, avatar_url: u.avatar_url, rating: u.rating, ratingCount: u.rating_count, noshow_count: u.noshow_count },
    ])
  )

  res.json(
    sorted.map((row) => ({
      ...row,
      activity: describeActivity(row.last_seen_at),
      profile: profileById[row.user_id] ?? null,
    }))
  )
})

router.get('/group/:groupId/messages', async (req, res) => {
  const { groupId } = req.params

  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('group_id', groupId)
    .order('created_at', { ascending: true })

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  res.json(data)
})

router.post('/group/:groupId/messages', async (req, res) => {
  const { groupId } = req.params
  const { requestId, text } = req.body

  if (!text || !text.trim()) {
    return res.status(400).json({ error: '메시지를 입력해주세요' })
  }

  const { data, error } = await supabase
    .from('messages')
    .insert({ group_id: groupId, request_id: requestId, text: text.trim() })
    .select()
    .single()

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  res.status(201).json(data)
})

router.post('/:id/respond', async (req, res) => {
  const { id } = req.params
  const { accept } = req.body

  const { data: target, error: fetchError } = await supabase
    .from('matching_requests')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchError) {
    return res.status(500).json({ error: fetchError.message })
  }

  if (!target || target.status !== 'pending') {
    return res.status(400).json({ error: '대기 중인 신청이 아니에요' })
  }

  const update = accept
    ? { status: 'matched' }
    : { group_id: null, status: 'open' }

  const { error: updateError } = await supabase
    .from('matching_requests')
    .update(update)
    .eq('id', id)

  if (updateError) {
    return res.status(500).json({ error: updateError.message })
  }

  const { data: members, error: membersError } = await supabase
    .from('matching_requests')
    .select('*')
    .eq('group_id', target.group_id)

  if (membersError) {
    return res.status(500).json({ error: membersError.message })
  }

  res.json({ members, groupCount: members.filter((m) => m.status === 'matched').length })
})

router.post('/:id/leave', async (req, res) => {
  const { id } = req.params

  const { error } = await supabase
    .from('matching_requests')
    .update({ group_id: null, status: 'open', is_leader: false })
    .eq('id', id)

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  res.json({ ok: true })
})

router.post('/:id/consent', async (req, res) => {
  const { id } = req.params

  const { error } = await supabase
    .from('matching_requests')
    .update({ consent: true })
    .eq('id', id)

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  res.json({ ok: true })
})

router.post('/:id/board', async (req, res) => {
  const { id } = req.params

  const { data: target, error: fetchError } = await supabase
    .from('matching_requests')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchError) {
    return res.status(404).json({ error: '요청을 찾을 수 없어요' })
  }

  if (!target.is_leader) {
    return res.status(403).json({ error: '그룹장만 탑승 확인을 할 수 있어요' })
  }

  const boardedAt = new Date()
  const result = classifyBoarding(target.desired_time, new Date(target.created_at), boardedAt)

  // 그룹장이 탑승을 확인하면 그룹 전체(매칭된 멤버 전원 + 아직 아무도 안 들어와 status가
  // 'open'으로 남아있는 혼자인 그룹장 자신)에게 반영
  const { error: updateError } = await supabase
    .from('matching_requests')
    .update({ boarded_at: boardedAt.toISOString() })
    .eq('group_id', target.group_id)
    .or('status.eq.matched,is_leader.eq.true')

  if (updateError) {
    return res.status(500).json({ error: updateError.message })
  }

  res.json(result)
})

router.post('/:id/rating', async (req, res) => {
  const { id } = req.params
  const { ratings } = req.body

  if (!Array.isArray(ratings) || ratings.length === 0) {
    return res.status(400).json({ error: '평가할 동행자가 없어요' })
  }

  for (const entry of ratings) {
    if (!entry.targetRequestId || !entry.stars || entry.stars < 1 || entry.stars > 5) {
      return res.status(400).json({ error: '별점을 선택해주세요' })
    }
  }

  const results = []
  for (const entry of ratings) {
    const { rating, error } = await applyRatingSubmission(id, entry.targetRequestId, entry.stars, !!entry.noshow)

    if (error) {
      return res.status(500).json({ error })
    }
    results.push(rating)
  }

  res.status(201).json(results)
})

export default router
