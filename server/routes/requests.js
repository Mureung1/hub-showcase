import { Router } from 'express'
import { supabase } from '../supabaseClient.js'

const router = Router()

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
  const { data, error } = await supabase
    .from('matching_requests')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  res.json(data)
})

export default router
