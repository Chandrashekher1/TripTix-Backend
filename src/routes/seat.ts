import express, { Response } from 'express'
import { isValidObjectId } from 'mongoose'
import auth from '../middleware/auth'
import admin from '../middleware/admin'
import { Seat } from '../models/seat'
import { AuthRequest } from '../types'

const router = express.Router()

// GET /:id — get all seats for a bus
router.get('/:id', [auth], async (req: AuthRequest, res: Response) => {
  try {
    const busId = req.params.id
    if (!isValidObjectId(busId)) {
      return res.status(400).json({ error: 'Invalid bus ID' })
    }

    const seats = await Seat.find({ busId })
    if (!seats || seats.length === 0) {
      return res.status(404).json({ message: 'No seats found for this bus.' })
    }

    return res.json({ success: true, data: seats })
  } catch (err) {
    const error = err as Error
    return res.status(500).json({ message: 'Internal Server error', error: error.message })
  }
})

// POST /add — create a seat (admin)
router.post('/add', [auth, admin], async (req: AuthRequest, res: Response) => {
  try {
    const { seatNumber, status, seatPreference, busId, userId } = req.body as {
      seatNumber: string
      status: string
      seatPreference: string
      busId: string
      userId: string
    }

    if (!seatNumber || !status || !seatPreference || !busId || !userId) {
      return res.status(400).json({ message: 'Missing required fields.' })
    }

    const seat = new Seat({ seatNumber, status, seatPreference, busId, userId })
    await seat.save()

    return res.status(201).json({ message: 'Seat created successfully', seat })
  } catch (err) {
    const error = err as Error
    return res.status(500).json({ error: error.message })
  }
})

export default router

