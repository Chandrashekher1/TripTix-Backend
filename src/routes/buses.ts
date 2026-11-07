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
      return res.status(400).json({ message: 'Missing required fields: origin, destination, date' })
    }

    const route = await Routes.findOne({ origin, destination })
    if (!route) return res.status(404).json({ message: 'Route not found' })

    const rawBuses = await BusModel.find({ routesId: route._id })
    const buses = rawBuses as (typeof rawBuses[0] & { availableSeats?: number })[]

    for (const bus of buses) {
      bus.availableSeats = await Seat.countDocuments({ busId: bus._id, status: 'available' })
    }

    return res.json(buses)
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
      isAc: isAc === 'true', isSeater: isSeater === 'true',
      isSleeper: isSleeper === 'true', isWifi: isWifi === 'true',
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
    const {
      routesId, busNumber, busType, operator, dep_time,
      arrivalTime, isAc, isSleeper, isSeater, price, totalSeat,
    } = req.body as Record<string, string>

    if (routesId && !Types.ObjectId.isValid(routesId)) {
      return res.status(400).json({ message: 'Invalid route ID' })
    }

    const files = req.files as Express.Multer.File[] | undefined
    const image = files?.map((f) => f.path)

    const bus = await BusModel.findByIdAndUpdate(
      req.params.id,
      {
        routesId: routesId ? new Types.ObjectId(routesId) : undefined,
        busNumber, busType, operator,
        isAc: isAc === 'true', isSeater: isSeater === 'true', isSleeper: isSleeper === 'true',
        price: parseFloat(price),
        totalSeat,
        dep_time: new Date(dep_time),
        arrivalTime: new Date(arrivalTime),
        images: image,
      },
      { new: true }
    )

    if (!bus) return res.status(400).json({ message: 'Something went wrong.' })
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
    return res.send(bus)
  } catch (err) {
    const error = err as Error
    return res.status(500).json({ success: false, message: 'Internal server error', error: error.message })
  }
})

export default router
