import express, { Response } from 'express'
import { isValidObjectId, Types } from 'mongoose'
import auth from '../middleware/auth'
import { Booking } from '../models/booking'
import { Trip } from '../models/trip'
import { TripSeat } from '../models/tripSeat'
import { PaymentModel } from '../models/payment'
import razorpay from '../config/razorpay'
import { tripRoom } from './socket'
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

// POST /:id/cancel-seats — cancel specific seat(s) on a booking and process pro-rata refund
router.post('/:id/cancel-seats', auth, async (req: AuthRequest, res: Response) => {
  try {
    const bookingId = req.params.id as string
    if (!isValidObjectId(bookingId)) {
      return res.status(400).json({ success: false, message: 'Invalid booking ID.' })
    }

    const userId = req.user?._id
    if (!userId || !isValidObjectId(userId)) {
      return res.status(401).json({ success: false, message: 'Unauthorized.' })
    }

    const { seatIds } = req.body as { seatIds: string[] }
    if (!Array.isArray(seatIds) || seatIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Please select at least one seat to cancel.' })
    }

    // Validate seatId formatting
    for (const sid of seatIds) {
      if (!isValidObjectId(sid)) {
        return res.status(400).json({ success: false, message: `Invalid seat ID: ${sid}` })
      }
    }

    // Fetch booking
    const booking = await Booking.findById(bookingId).populate({
      path: 'seatIds',
      populate: { path: 'seatId', select: 'seatNumber' },
    })

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' })
    }

    if (booking.userId.toString() !== userId.toString() && !req.user?.isAdmin) {
      return res.status(403).json({ success: false, message: 'Access denied. You do not own this booking.' })
    }

    if (booking.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'This booking has already been completely cancelled.' })
    }

    // Validate trip departure cutoff
    const trip = await Trip.findById(booking.tripId)
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Associated trip not found.' })
    }

    if (new Date() >= new Date(trip.departureDate)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel seats after trip departure time.',
      })
    }

    // Identify already cancelled seat IDs
    const alreadyCancelledSeatIds = new Set(
      (booking.cancelledSeats || []).map((cs) => cs.seatId.toString())
    )

    // Check that requested seats belong to this booking and are not already cancelled
    const bookingSeatIdStrings = booking.seatIds.map((s: any) =>
      (s._id || s).toString()
    )

    for (const sid of seatIds) {
      if (!bookingSeatIdStrings.includes(sid)) {
        return res.status(400).json({
          success: false,
          message: `Seat ${sid} is not part of this booking.`,
        })
      }
      if (alreadyCancelledSeatIds.has(sid)) {
        return res.status(400).json({
          success: false,
          message: `Seat ${sid} has already been cancelled.`,
        })
      }
    }

    // Fetch payment record
    const payment = await PaymentModel.findOne({
      $or: [
        { bookingId: booking._id },
        ...(booking.razorpayOrderId ? [{ razorpayOrderId: booking.razorpayOrderId }] : []),
      ],
    })

    if (!payment || !payment.razorpayPaymentId) {
      return res.status(400).json({
        success: false,
        message: 'Payment details not found or payment ID is missing. Cannot process online refund.',
      })
    }

    // Pro-rata refund calculation
    const totalOriginalSeats = booking.seatIds.length
    const perSeatRefundPaise = Math.round(payment.amountPaise / totalOriginalSeats)
    const totalRefundPaise = perSeatRefundPaise * seatIds.length

    // Ensure we don't refund more than what remains
    const currentRefunded = payment.refundedAmountPaise || 0
    if (currentRefunded + totalRefundPaise > payment.amountPaise) {
      return res.status(400).json({
        success: false,
        message: 'Refund amount exceeds total paid amount.',
      })
    }

    // ATOMIC CAS CHECK: Lock and mark seats as available in DB first (Double-Refund Prevention)
    const claimedSeatIds: Types.ObjectId[] = []
    for (const sid of seatIds) {
      const result = await TripSeat.updateOne(
        {
          _id: new Types.ObjectId(sid),
          tripId: booking.tripId,
          status: 'booked',
        },
        {
          $set: {
            status: 'available',
            lockedBy: null,
            lockedUntil: null,
            lockId: null,
          },
        }
      )

      if (result.modifiedCount === 0) {
        // Seat was already cancelled or not in booked state! Roll back any previously flipped seats
        if (claimedSeatIds.length > 0) {
          await TripSeat.updateMany(
            { _id: { $in: claimedSeatIds } },
            { $set: { status: 'booked' } }
          )
        }
        return res.status(409).json({
          success: false,
          message: 'One or more selected seats have already been cancelled or are no longer booked.',
        })
      }
      claimedSeatIds.push(new Types.ObjectId(sid))
    }

    // Call Razorpay API to issue partial/full refund
    let razorpayRefund: any
    try {
      razorpayRefund = await (razorpay.payments as any).refund(payment.razorpayPaymentId, {
        amount: totalRefundPaise,
        notes: {
          bookingId: booking._id.toString(),
          cancelledSeatCount: seatIds.length,
          reason: 'Customer initiated seat cancellation',
        },
      })
    } catch (refundErr: any) {
      console.error('Razorpay refund API error:', refundErr)
      // Compensating rollback: Revert seats back to booked
      await TripSeat.updateMany(
        { _id: { $in: claimedSeatIds } },
        { $set: { status: 'booked' } }
      )
      return res.status(502).json({
        success: false,
        message: refundErr?.error?.description || refundErr?.message || 'Failed to process refund with payment gateway.',
      })
    }

    const razorpayRefundId = razorpayRefund.id || `rfnd_${Date.now()}`

    // Map cancelled seats with seatNumber and passengerName
    const cancelledSeatDocs = claimedSeatIds.map((cid, idx) => {
      // Find matching seat doc from populated seatIds
      const seatPopulated: any = booking.seatIds.find(
        (s: any) => (s._id || s).toString() === cid.toString()
      )
      const seatNumber = seatPopulated?.seatId?.seatNumber || `Seat ${cid.toString().slice(-4)}`

      // Find matching passenger if passengerDetails has seatId or by position
      let passengerName = 'Passenger'
      if (booking.passengerDetails && booking.passengerDetails.length > 0) {
        const pMatch = booking.passengerDetails.find(
          (p: any) => p.seatId && p.seatId.toString() === cid.toString()
        )
        if (pMatch) {
          passengerName = pMatch.name
        } else {
          // Fallback to index if 1:1 mapping
          const originalIdx = bookingSeatIdStrings.indexOf(cid.toString())
          if (originalIdx !== -1 && booking.passengerDetails[originalIdx]) {
            passengerName = booking.passengerDetails[originalIdx].name
          }
        }
      }

      return {
        seatId: cid,
        seatNumber,
        passengerName,
        refundAmountPaise: perSeatRefundPaise,
        razorpayRefundId,
        cancelledAt: new Date(),
      }
    })

    // Update Booking document
    booking.cancelledSeats.push(...cancelledSeatDocs)
    const totalCancelledCount = booking.cancelledSeats.length
    if (totalCancelledCount >= totalOriginalSeats) {
      booking.status = 'cancelled'
    } else {
      booking.status = 'partially_cancelled'
    }
    await booking.save()

    // Update Payment record
    payment.refundedAmountPaise = (payment.refundedAmountPaise || 0) + totalRefundPaise
    for (const cid of claimedSeatIds) {
      payment.refunds.push({
        razorpayRefundId,
        amountPaise: perSeatRefundPaise,
        seatId: cid,
        createdAt: new Date(),
      })
    }
    if (payment.refundedAmountPaise >= payment.amountPaise) {
      payment.status = 'refunded'
    } else {
      payment.status = 'partially_refunded'
    }
    await payment.save()

    // Real-time broadcast to trip room: seats are now available
    if (global.io) {
      global.io.to(tripRoom(booking.tripId.toString())).emit('seatsUpdated', {
        tripId: booking.tripId.toString(),
        seats: claimedSeatIds.map((cid) => ({
          tripSeatId: cid.toString(),
          status: 'available',
        })),
      })
    }

    return res.json({
      success: true,
      message: `Successfully cancelled ${seatIds.length} seat(s). Refund of INR ${(totalRefundPaise / 100).toFixed(2)} processed.`,
      refundedAmountInr: totalRefundPaise / 100,
      razorpayRefundId,
      bookingStatus: booking.status,
      cancelledSeats: cancelledSeatDocs,
    })
  } catch (err) {
    const error = err as Error
    console.error('Error cancelling seats:', error)
    return res.status(500).json({ success: false, message: 'Failed to cancel seats. Please try again.' })
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
