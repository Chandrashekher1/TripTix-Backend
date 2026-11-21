import express, { Request, Response } from 'express'
import { isValidObjectId } from 'mongoose'
import auth from '../middleware/auth'
import admin from '../middleware/admin'
import { Seat } from '../models/seat'
import { TripSeat } from '../models/tripSeat'
import { AuthRequest } from '../types'

const router = express.Router()


router.get('/trip/:tripId', async (req: Request, res: Response) => {
  try {
    const tripId = req.params.tripId as string
    if (!isValidObjectId(tripId)) {
      return res.status(400).json({ error: 'Invalid trip ID' })
    }

    const tripSeats = await TripSeat.find({ tripId })
      .select('_id status seatId lockedUntil')
      .populate('seatId', 'seatNumber seatPreference')
      .lean()
    if (tripSeats.length === 0) {
      return res.status(404).json({ message: 'No seats found for this trip.' })
    }

    const now = Date.now()
    const data = tripSeats.map((ts) => {
      const seat = ts.seatId as unknown as { seatNumber: string; seatPreference: string }

      const expired = ts.status === 'locked' && ts.lockedUntil && ts.lockedUntil.getTime() <= now
      return {
        _id: ts._id,
        seatNumber: seat?.seatNumber,
        seatPreference: seat?.seatPreference,
        status: expired ? 'available' : ts.status,
      }
    })

    return res.json({ success: true, data })
  } catch (err) {
    const error = err as Error
    return res.status(500).json({ message: 'Internal Server error', error: error.message })
  }
})

// GET /:id — get all seats for a bus (public: allow guests to view and select seats)
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const busId = req.params.id as string
    if (!isValidObjectId(busId)) {
      return res.status(400).json({ error: 'Invalid bus ID' })
    }

    const seats = await Seat.find({ busId }).select('_id seatNumber status seatPreference busId')
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
    const { seatNumber, seatPreference, busId } = req.body as {
      seatNumber?: string
      seatPreference?: string
      busId?: string
    }

    if (!seatNumber || !seatPreference || !busId) {
      return res.status(400).json({ message: 'Missing required fields.' })
    }

    if (!isValidObjectId(busId)) {
      return res.status(400).json({ message: 'Invalid bus ID.' })
    }

    const seat = await Seat.create({ seatNumber, seatPreference, busId })
    return res.status(201).json({ message: 'Seat created successfully', seat })
  } catch (err) {
    const error = err as { code?: number; message: string }
    if (error.code === 11000) {
      return res.status(409).json({ message: 'A seat with this number already exists for this bus.' })
    }
    return res.status(500).json({ error: error.message })
  }
})

router.patch('/:id', [auth, admin], async (req: AuthRequest, res: Response) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid seat ID.' })
    }

    const { seatNumber, seatPreference } = req.body as { seatNumber?: string; seatPreference?: string }
    const update: { seatNumber?: string; seatPreference?: string } = {}
    if (seatNumber !== undefined) update.seatNumber = seatNumber
    if (seatPreference !== undefined) update.seatPreference = seatPreference

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ message: 'seatNumber or seatPreference is required.' })
    }

    const seat = await Seat.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true })
    if (!seat) return res.status(404).json({ message: 'Seat not found.' })
    return res.json({ success: true, data: seat })
  } catch (err) {
    const error = err as { code?: number; message: string }
    if (error.code === 11000) {
      return res.status(409).json({ message: 'A seat with this number already exists for this bus.' })
    }
    return res.status(500).json({ error: error.message })
  }
})

router.delete('/:id', [auth, admin], async (req: AuthRequest, res: Response) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid seat ID.' })
    }

    const seat = await Seat.findByIdAndDelete(req.params.id)
    if (!seat) return res.status(404).json({ message: 'Seat not found.' })
    return res.json({ success: true, message: 'Seat deleted successfully.' })
  } catch (err) {
    const error = err as Error
    return res.status(500).json({ error: error.message })
  }
})

export default router
