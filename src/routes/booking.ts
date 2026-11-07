import express, { Response } from 'express'
import auth from '../middleware/auth'
import { Booking } from '../models/booking'
import { AuthRequest } from '../types'

const router = express.Router()

// POST /book — create a booking
router.post('/book', auth, async (req: AuthRequest, res: Response) => {
  try {
    const { userId, busId, passengerDetails, seatIds } = req.body as {
      userId: string
      busId: string
      passengerDetails: { name: string; age: string; gender: string }[]
      seatIds: string[]
    }

    if (!userId || !busId || !passengerDetails?.length || !seatIds?.length) {
      return res.status(400).json({ success: false, message: 'Missing fields' })
    }

    const booking = new Booking({ userId, busId, passengerDetails, seatIds })
    await booking.save()

    return res.status(201).json({ success: true, message: 'Booking confirmed', booking })
  } catch (err) {
    const error = err as Error
    console.error(error.message)
    return res.status(500).json({ success: false, message: 'Server error' })
  }
})

export default router

