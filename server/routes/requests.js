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

// 평점을 실제로 기록하고, 같은 그룹의 나머지 멤버들 프로필 평점에 반영
async function applyRatingSubmission(requestId, stars, noshowReported) {
  const { data: target, error: fetchError } = await supabase
    .from('matching_requests')
    .select('group_id')
    .eq('id', requestId)
    .single()

  if (fetchError) {
    return { error: fetchError.message }
  }

  // 노쇼 신고면 실제 입력한 별점 대신 1점으로 강제 반영
  const effectiveStars = noshowReported ? 1 : stars

  const { data: rating, error: insertError } = await supabase
    .from('ratings')
    .insert({ request_id: requestId, group_id: target.group_id, stars, noshow_reported: !!noshowReported })
    .select()
    .single()

  if (insertError) {
    return { error: insertError.message }
  }

  if (target.group_id) {
    const { data: otherMembers } = await supabase
      .from('matching_requests')
      .select('id, user_id')
      .eq('group_id', target.group_id)
      .neq('id', requestId)

    for (const member of otherMembers ?? []) {
      if (!member.user_id) continue

      const { data: user } = await supabase
        .from('users')
        .select('rating, rating_count, noshow_count')
        .eq('id', member.user_id)
        .single()

      if (!user) continue

      const { rating: newRating, count: newCount } = applyRating(user.rating, user.rating_count, effectiveStars)

      await supabase
        .from('users')
        .update({
          rating: newRating,
          rating_count: newCount,
          noshow_count: noshowReported ? (user.noshow_count ?? 0) + 1 : user.noshow_count,
        })
        .eq('id', member.user_id)
    }
  }

  return { rating }
}

// 탑승 후 1시간 넘게 평가가 없는 트립은 불만 없음으로 보고 자동 5점 처리
async function sweepAutoRatings() {
  const { data: boarded } = await supabase
    .from('matching_requests')
    .select('id, boarded_at')
    .not('boarded_at', 'is', null)

  const overdue = (boarded ?? []).filter((r) => isOverdueForAutoRating(r.boarded_at))
  if (overdue.length === 0) return

  const ids = overdue.map((r) => r.id)
  const { data: existingRatings } = await supabase.from('ratings').select('request_id').in('request_id', ids)
  const ratedIds = new Set((existingRatings ?? []).map((r) => r.request_id))

  for (const row of overdue) {
    if (ratedIds.has(row.id)) continue
    await applyRatingSubmission(row.id, 5, false)
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

  // 같은 group_id끼리는 "이미 모인 방" 하나로 묶는다. group_id가 없는 요청은 자기 혼자만의 방 취급.
  const roomsByKey = new Map()
  for (const row of withHubNames) {
    const key = row.group_id ?? row.id
    if (!roomsByKey.has(key)) {
      roomsByKey.set(key, { representative: row, memberIds: [] })
    }
    roomsByKey.get(key).memberIds.push(row.id)
  }

  const rooms = [...roomsByKey.values()]
    .map(({ representative, memberIds }) => ({
      ...representative,
      groupCount: memberIds.length,
      memberIds,
    }))
    .filter((room) => room.groupCount < 4)
    // 마지막 활동(하트비트)이 오래된 방은 후보 목록에서 제외 (방장이 떠나고 안 돌아온 방 정리)
    .filter((room) => !isRoomStale(room.last_seen_at))

  const { myRequestId } = req.query
  const me = myRequestId ? data.find((r) => r.id === myRequestId) : null

  // 각 방 대표자의 프로필(이름/단과대/사진)과 성별을 users 테이블에서 한 번에 조회
  const userIds = [...new Set([me?.user_id, ...rooms.map((r) => r.user_id)].filter(Boolean))]
  const { data: userRows } = await supabase
    .from('users')
    .select('id, gender, name, nickname, college, avatar_url, rating, noshow_count')
    .in('id', userIds.length ? userIds : [''])
  const genderById = Object.fromEntries((userRows ?? []).map((u) => [u.id, u.gender]))
  const profileById = Object.fromEntries(
    (userRows ?? []).map((u) => [
      u.id,
      {
        name: u.nickname || u.name,
        college: u.college,
        avatar_url: u.avatar_url,
        rating: u.rating,
        noshow_count: u.noshow_count,
      },
    ])
  )

  const withExtras = (room) => ({
    ...room,
    activity: describeActivity(room.last_seen_at),
    profile: profileById[room.user_id] ?? null,
  })

  if (!me) {
    return res.json(rooms.map(withExtras))
  }

  const myGenderInfo = { gender: genderById[me.user_id] ?? 'unknown', genderOnly: me.gender_only }

  const filteredRooms = rooms.filter((room) => {
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
    .update({ group_id: groupId })
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
  res.json(sorted.map((row) => ({ ...row, activity: describeActivity(row.last_seen_at) })))
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
    .update({ group_id: null, status: 'open' })
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

  const boardedAt = new Date()
  const result = classifyBoarding(target.desired_time, new Date(target.created_at), boardedAt)

  const { error: updateError } = await supabase
    .from('matching_requests')
    .update({ boarded_at: boardedAt.toISOString() })
    .eq('id', id)

  if (updateError) {
    return res.status(500).json({ error: updateError.message })
  }

  res.json(result)
})

router.post('/:id/rating', async (req, res) => {
  const { id } = req.params
  const { stars, noshow } = req.body

  if (!stars || stars < 1 || stars > 5) {
    return res.status(400).json({ error: '별점을 선택해주세요' })
  }

  const { rating, error } = await applyRatingSubmission(id, stars, !!noshow)

  if (error) {
    return res.status(500).json({ error })
  }

  res.status(201).json(rating)
})

export default router
