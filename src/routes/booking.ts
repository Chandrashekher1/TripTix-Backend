import express, { Response } from 'express'
import { isValidObjectId } from 'mongoose'
import auth from '../middleware/auth'
import { Booking } from '../models/booking'
import { getBookingInvoiceData, generateInvoicePdfBuffer, InvoiceError } from '../services/invoiceService'
import { AuthRequest } from '../types'

const router = express.Router()

// GET /my-bookings — list authenticated user's bookings with bus, route, trip, and seat numbers
router.get('/my-bookings', auth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id
    if (!userId || !isValidObjectId(userId)) {
      return res.status(401).json({ success: false, message: 'Unauthorized.' })
    }

    const bookings = await Booking.find({ userId })
      .sort({ createdAt: -1 })
      .populate({
        path: 'busId',
        select: 'operator busNumber busType dep_time arrivalTime price routesId',
        populate: { path: 'routesId', select: 'origin destination distance' },
      })
      .populate('tripId', 'departureDate')
      .populate({
        path: 'seatIds',
        select: 'seatId',
        populate: { path: 'seatId', select: 'seatNumber seatPreference' },
      })
      .lean()

    return res.json({ success: true, data: bookings })
  } catch (err) {
    const error = err as Error
    console.error('Error fetching user bookings:', error.message)
    return res.status(500).json({ success: false, message: 'Server error' })
  }
})

// GET /:id/invoice — download PDF invoice (or ?format=json for structured invoice data)
router.get('/:id/invoice', auth, async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid booking ID.' })
    }

    const userId = req.user?._id
    if (!userId || !isValidObjectId(userId)) {
      return res.status(401).json({ success: false, message: 'Unauthorized.' })
    }

    const invoiceData = await getBookingInvoiceData(id, userId, Boolean(req.user?.isAdmin))

    if (req.query.format === 'json') {
      return res.json({ success: true, data: invoiceData })
    }

    const pdfBuffer = await generateInvoicePdfBuffer(invoiceData)

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="TripTix-${invoiceData.invoiceNumber}.pdf"`)
    res.setHeader('Content-Length', pdfBuffer.length)
    return res.send(pdfBuffer)
  } catch (err) {
    if (err instanceof InvoiceError) {
      return res.status(err.statusCode).json({ success: false, message: err.message })
    }
    const error = err as Error
    console.error('Error generating invoice:', error.message)
    return res.status(500).json({ success: false, message: 'Failed to generate invoice.' })
  }
})

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
