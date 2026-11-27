import express, { Response } from 'express'
import { isValidObjectId, Types } from 'mongoose'
import auth from '../middleware/auth'
import admin from '../middleware/admin'
import { uploadMultiple } from '../config/storage'
import BusModel from '../models/buses'
import { Seat } from '../models/seat'
import { Routes } from '../models/routes'
import { Trip } from '../models/trip'
import { Booking } from '../models/booking'
import { AuthRequest } from '../types'

const router = express.Router()

function normalizeBoolean(value: unknown): boolean | undefined {
  if (value === true || value === 'true') return true
  if (value === false || value === 'false') return false
  return undefined
}

// GET /track — search bus info and schedule by query (busNumber or bookingId)
router.get('/track', async (req: AuthRequest, res: Response) => {
  try {
    const query = ((req.query.q || req.query.query || '') as string).trim()
    if (!query) {
      return res.status(400).json({ success: false, message: 'Please provide a bus number or booking ID to track.' })
    }

    let bookingDoc: any = null
    let busDoc: any = null
    let tripDoc: any = null

    // 1. Try finding booking by ID or Order ID or invoice short ID if query matches
    if (isValidObjectId(query)) {
      bookingDoc = await Booking.findById(query)
        .populate({
          path: 'busId',
          populate: { path: 'routesId' },
        })
        .populate('tripId')
        .populate({
          path: 'seatIds',
          populate: { path: 'seatId', select: 'seatNumber seatPreference' },
        })
    }

    if (!bookingDoc) {
      // Check if it's an order ID or INV short ID
      bookingDoc = await Booking.findOne({
        $or: [
          { razorpayOrderId: query },
          { razorpayPaymentId: query },
          ...(query.toUpperCase().startsWith('INV-')
            ? [{ _id: { $regex: query.replace(/^INV-/i, ''), $options: 'i' } }]
            : []),
        ],
      })
        .populate({
          path: 'busId',
          populate: { path: 'routesId' },
        })
        .populate('tripId')
        .populate({
          path: 'seatIds',
          populate: { path: 'seatId', select: 'seatNumber seatPreference' },
        })
    }

    if (bookingDoc) {
      busDoc = bookingDoc.busId
      tripDoc = bookingDoc.tripId
    } else {
      // 2. Search bus by bus number (case-insensitive)
      busDoc = await BusModel.findOne({
        busNumber: { $regex: new RegExp(`^${query}$`, 'i') },
      }).populate('routesId')

      if (!busDoc) {
        // Also try partial match on busNumber or operator if exact didn't match
        busDoc = await BusModel.findOne({
          $or: [
            { busNumber: { $regex: query, $options: 'i' } },
            { operator: { $regex: query, $options: 'i' } },
          ],
        }).populate('routesId')
      }

      if (busDoc) {
        // Find upcoming or most recent trip for this bus
        tripDoc = await Trip.findOne({ busId: busDoc._id }).sort({ departureDate: -1 })
      }
    }

    if (!busDoc) {
      return res.status(404).json({
        success: false,
        message: `No bus or booking found matching "${query}". Please check the bus number or booking ID.`,
      })
    }

    const route = busDoc.routesId as any

    // Calculate trip status based on schedule
    let departureTime = busDoc.dep_time
    let arrivalTime = busDoc.arrivalTime
    let journeyDate = tripDoc?.departureDate || busDoc.date || new Date()

    let journeyStatus: 'scheduled' | 'on_time' | 'arrived' = 'scheduled'
    const now = new Date()

    if (tripDoc?.departureDate) {
      const depDate = new Date(tripDoc.departureDate)
      if (now < depDate) {
        journeyStatus = 'scheduled'
      } else {
        journeyStatus = 'on_time'
      }
    }

    const trackingResult = {
      type: bookingDoc ? 'booking' : 'bus',
      booking: bookingDoc
        ? {
            bookingId: bookingDoc._id,
            status: bookingDoc.status,
            createdAt: bookingDoc.createdAt,
            passengerCount: bookingDoc.passengerDetails?.length || 0,
            seats: (bookingDoc.seatIds || []).map((s: any) => s.seatId?.seatNumber || 'Seat'),
            cancelledSeats: bookingDoc.cancelledSeats || [],
          }
        : null,
      bus: {
        _id: busDoc._id,
        busNumber: busDoc.busNumber,
        operator: busDoc.operator,
        busType: busDoc.busType,
        rating: busDoc.rating || 4.2,
        totalSeats: busDoc.totalSeat,
        price: busDoc.price,
        amenities: {
          isAc: Boolean(busDoc.isAc),
          isSleeper: Boolean(busDoc.isSleeper),
          isSeater: Boolean(busDoc.isSeater),
          isWifi: Boolean(busDoc.isWifi),
        },
        depTime: departureTime,
        arrivalTime: arrivalTime,
      },
      route: route
        ? {
            origin: route.origin,
            destination: route.destination,
            distance: route.distance,
          }
        : null,
      trip: tripDoc
        ? {
            tripId: tripDoc._id,
            departureDate: tripDoc.departureDate,
            journeyStatus,
          }
        : null,
    }

    return res.json({ success: true, data: trackingResult })
  } catch (err) {
    const error = err as Error
    console.error('Error tracking bus:', error)
    return res.status(500).json({ success: false, message: 'Server error while fetching bus tracking info.' })
  }
})

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
