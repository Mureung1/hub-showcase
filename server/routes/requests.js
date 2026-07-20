import { Router } from 'express'
import { supabase } from '../supabaseClient.js'

const router = Router()

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
  const { direction, departureHub, destHub, time, arrival, genderOnly } = req.body

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
    })
    .select()
    .single()

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  res.status(201).json(data)
})

router.get('/', async (req, res) => {
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

    const [lower, upper] = timeWindow(time, 15)

    query = query
      .eq('departure_hub_id', departureHubId)
      .eq('destination_hub_id', destinationHubId)
      .eq('status', 'open')
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

  res.json(withHubNames)
})

export default router
