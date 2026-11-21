import express, { Response } from 'express'
import { Types } from 'mongoose'
import auth from '../middleware/auth'
import admin from '../middleware/admin'
import { uploadMultiple } from '../config/storage'
import BusModel from '../models/buses'
import { Seat } from '../models/seat'
import { Routes } from '../models/routes'
import { AuthRequest } from '../types'

const router = express.Router()

function normalizeBoolean(value: unknown): boolean | undefined {
  if (value === true || value === 'true') return true
  if (value === false || value === 'false') return false
  return undefined
}

// GET /topRated — all buses with routes populated
router.get('/topRated', async (_req: AuthRequest, res: Response) => {
  try {
    const buses = await BusModel.find().populate('routesId')
    if (!buses) return res.status(404).json({ message: 'Route not found' })
    return res.json(buses)
  } catch (err) {
    const error = err as Error
    return res.status(500).json({ success: false, message: 'Internal server error.', error: error.message })
  }
})

// GET / — search buses by origin, destination, date
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { origin, destination } = req.query as { origin?: string; destination?: string }
    if (!origin || !destination) {
      return res.status(400).json({ message: 'Missing required fields: origin, destination' })
    }

    const normalizedOrigin = origin.trim().toLowerCase()
    const normalizedDestination = destination.trim().toLowerCase()

    const route = await Routes.findOne({ origin: normalizedOrigin, destination: normalizedDestination })
    if (!route) return res.status(404).json({ message: 'Route not found' })

    const rawBuses = await BusModel.find({ routesId: route._id }).populate('routesId')
    const buses = rawBuses.map((bus) => bus.toObject() as typeof bus & { availableSeats?: number })

    await Promise.all(
      buses.map(async (bus) => {
        bus.availableSeats = await Seat.countDocuments({ busId: bus._id, status: 'available' })
      })
    )

    return res.json(buses)
  } catch (err) {
    const error = err as Error
    return res.status(500).json({ success: false, message: 'Internal server error.', error: error.message })
  }
})

router.get('/admin/all', [auth, admin], async (_req: AuthRequest, res: Response) => {
  try {
    const buses = await BusModel.find().populate('routesId')
    return res.json({ success: true, data: buses })
  } catch (err) {
    const error = err as Error
    return res.status(500).json({ success: false, message: 'Internal server error.', error: error.message })
  }
})

// GET /:id — get bus by id
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const busId = req.params.id as string
    if (!Types.ObjectId.isValid(busId as string)) {
      return res.status(400).json({ message: 'Invalid bus ID' })
    }
    const bus = await BusModel.findById(busId).populate('routesId')
    return res.json(bus)
  } catch {
    return res.status(500).json({ success: false, message: 'Internal Server error.' })
  }
})

// POST / — add new bus (admin)
router.post('/', [auth, admin], uploadMultiple, async (req: AuthRequest, res: Response) => {
  try {
    const {
      routesId, busNumber, busType, operator, dep_time,
      arrivalTime, isAc, isSleeper, isSeater, price,
      totalSeat, rating, isWifi,
    } = req.body as Record<string, string>

    if (!routesId || !busNumber || !busType || !operator || !dep_time || !arrivalTime || !price || !totalSeat) {
      return res.status(400).json({ message: 'Missing required fields' })
    }

    if (!Types.ObjectId.isValid(routesId)) {
      return res.status(400).json({ message: 'Invalid route ID' })
    }

    const files = req.files as Express.Multer.File[] | undefined
    const image = files?.map((f) => f.path)

    let bus = new BusModel({
      routesId: new Types.ObjectId(routesId),
      busNumber, busType, operator,
      isAc: normalizeBoolean(isAc) ?? false, isSeater: normalizeBoolean(isSeater) ?? false,
      isSleeper: normalizeBoolean(isSleeper) ?? false, isWifi: normalizeBoolean(isWifi) ?? false,
      price: parseFloat(price),
      totalSeat,
      rating: parseFloat(rating) || 1,
      dep_time: new Date(dep_time),
      arrivalTime: new Date(arrivalTime),
      images: image,
    })

    bus = await bus.save()
    console.log(bus)
    return res.status(200).json({ success: true, message: 'Bus added successfully', data: bus })
  } catch (err) {
    const error = err as Error
    console.error(error)
    return res.status(500).json({ success: false, message: 'Internal Server error', error: error.message })
  }
})

// PATCH /:id — update bus (admin)
router.patch('/:id', [auth, admin], async (req: AuthRequest, res: Response) => {
  try {
    const busId = req.params.id as string
    if (!Types.ObjectId.isValid(busId)) {
      return res.status(400).json({ message: 'Invalid bus ID' })
    }

    const body = req.body as Record<string, unknown>
    const update: Record<string, unknown> = {}

    if (body.routesId !== undefined) {
      if (typeof body.routesId !== 'string' || !Types.ObjectId.isValid(body.routesId)) {
        return res.status(400).json({ message: 'Invalid route ID' })
      }
      update.routesId = new Types.ObjectId(body.routesId)
    }

    for (const field of ['busNumber', 'busType', 'operator', 'totalSeat']) {
      if (body[field] !== undefined) update[field] = body[field]
    }

    for (const field of ['isAc', 'isSeater', 'isSleeper', 'isWifi']) {
      if (body[field] !== undefined) {
        const value = normalizeBoolean(body[field])
        if (value === undefined) return res.status(400).json({ message: `Invalid ${field} value` })
        update[field] = value
      }
    }

    if (body.price !== undefined) {
      const price = typeof body.price === 'number' ? body.price : Number(body.price)
      if (!Number.isFinite(price)) return res.status(400).json({ message: 'Invalid price' })
      update.price = price
    }

    for (const field of ['dep_time', 'arrivalTime']) {
      if (body[field] !== undefined) {
        const date = new Date(String(body[field]))
        if (Number.isNaN(date.getTime())) return res.status(400).json({ message: `Invalid ${field}` })
        update[field] = date
      }
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ message: 'No valid fields provided for update' })
    }

    const bus = await BusModel.findByIdAndUpdate(busId, update, { new: true, runValidators: true })
    if (!bus) return res.status(404).json({ message: 'No bus found with this ID' })
    return res.status(200).json({ success: true, message: 'Bus updated successfully', data: bus })
  } catch (err) {
    const error = err as Error
    return res.status(500).json({ success: false, message: 'Internal server error', error: error.message })
  }
})

// DELETE /:id — delete bus (admin)
router.delete('/:id', [auth, admin], async (req: AuthRequest, res: Response) => {
  try {
    const bus = await BusModel.findByIdAndDelete(req.params.id)
    if (!bus) return res.status(400).json({ message: 'No bus found with this Id' })
    console.log(bus)
    return res.send(bus)
  } catch (err) {
    const error = err as Error
    return res.status(500).json({ success: false, message: 'Internal server error', error: error.message })
  }
})

export default router
