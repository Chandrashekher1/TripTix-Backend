import express, { Response } from 'express'
import mongoose, { isValidObjectId } from 'mongoose'
import auth from '../middleware/auth'
import admin from '../middleware/admin'
import { Trip } from '../models/trip'
import { TripSeat } from '../models/tripSeat'
import { createTrip, TripServiceError } from '../services/tripService'
import { AuthRequest } from '../types'

const router = express.Router()


router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { busId } = req.query as { busId?: string }
    if (!busId || !isValidObjectId(busId)) {
      return res.status(400).json({ message: 'A valid busId is required.' })
    }
    const trips = await Trip.find({ busId }).sort({ departureDate: 1 })
    return res.json({ success: true, data: trips })
  } catch (err) {
    const error = err as Error
    return res.status(500).json({ success: false, message: 'Internal Server error.', error: error.message })
  }
})


router.post('/', [auth, admin], async (req: AuthRequest, res: Response) => {
  try {
    const { busId, departureDate } = req.body as { busId?: string; departureDate?: string }
    if (!busId || !departureDate) {
      return res.status(400).json({ message: 'Missing required fields: busId, departureDate' })
    }
    if (!isValidObjectId(busId)) {
      return res.status(400).json({ message: 'Invalid bus ID.' })
    }
    const date = new Date(departureDate)
    if (Number.isNaN(date.getTime())) {
      return res.status(400).json({ message: 'Invalid departureDate.' })
    }

    const trip = await createTrip(busId, date)
    return res.status(201).json({ success: true, message: 'Trip created successfully', data: trip })
  } catch (err) {
    if (err instanceof TripServiceError) {
      const status = err.code === 'TRIP_EXISTS' ? 409 : err.code === 'BUS_NOT_FOUND' ? 404 : 400
      return res.status(status).json({ success: false, message: err.message })
    }
    const error = err as Error
    return res.status(500).json({ success: false, message: 'Internal Server error.', error: error.message })
  }
})

router.patch('/:id', [auth, admin], async (req: AuthRequest, res: Response) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid trip ID.' })
    }

    const { departureDate } = req.body as { departureDate?: string }
    if (!departureDate) {
      return res.status(400).json({ message: 'departureDate is required.' })
    }

    const date = new Date(departureDate)
    if (Number.isNaN(date.getTime())) {
      return res.status(400).json({ message: 'Invalid departureDate.' })
    }

    const trip = await Trip.findByIdAndUpdate(
      req.params.id,
      { departureDate: date },
      { new: true, runValidators: true }
    )
    if (!trip) return res.status(404).json({ message: 'Trip not found.' })
    return res.json({ success: true, data: trip })
  } catch (err) {
    const error = err as { code?: number; message: string }
    if (error.code === 11000) {
      return res.status(409).json({ message: 'A trip already exists for this bus and departure date.' })
    }
    return res.status(500).json({ success: false, message: 'Internal Server error.', error: error.message })
  }
})

router.delete('/:id', [auth, admin], async (req: AuthRequest, res: Response) => {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: 'Invalid trip ID.' })
  }

  const session = await mongoose.startSession()
  try {
    let deleted = false
    await session.withTransaction(async () => {
      const trip = await Trip.findById(req.params.id).session(session)
      if (!trip) return

      await TripSeat.deleteMany({ tripId: trip._id }).session(session)
      const result = await Trip.deleteOne({ _id: trip._id }).session(session)
      deleted = result.deletedCount === 1
    })

    if (!deleted) return res.status(404).json({ message: 'Trip not found.' })
    return res.json({ success: true, message: 'Trip deleted successfully.' })
  } catch (err) {
    const error = err as Error
    return res.status(500).json({ success: false, message: 'Internal Server error.', error: error.message })
  } finally {
    await session.endSession()
  }
})

export default router
