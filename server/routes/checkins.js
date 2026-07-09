import { Router } from 'express'
import { getCheckins, createCheckin } from '../services/checkinService.js'

const router = Router()

router.get('/', async (req, res) => {
  const checkins = await getCheckins()
  res.json(checkins)
})

router.post('/', async (req, res) => {
  const checkin = await createCheckin(req.body)
  res.status(201).json(checkin)
})

export default router
