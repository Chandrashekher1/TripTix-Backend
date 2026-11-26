import crypto from 'crypto'
import express, { Request, Response } from 'express'
import mongoose, { isValidObjectId, Types } from 'mongoose'
import auth from '../middleware/auth'
import razorpay from '../config/razorpay'
import { PaymentModel } from '../models/payment'
import { Trip } from '../models/trip'
import { TripSeat } from '../models/tripSeat'
import { Booking } from '../models/booking'
import { tripRoom } from './socket'
import { AuthRequest } from '../types'

const router = express.Router()

export interface FulfillPaymentResult {
  success: boolean
  code?: string
  message: string
  booking?: InstanceType<typeof Booking> | null
  payment?: InstanceType<typeof PaymentModel> | null
  alreadyProcessed?: boolean
}

/**
 * Shared atomic fulfillment function used by both client /verify and server-to-server /webhook.
 * Ensures strict idempotency: if already fulfilled, skips writes and returns existing booking.
 */
export async function fulfillPayment({
  orderId,
  paymentId,
  passengerDetails,
}: {
  orderId: string
  paymentId: string
  passengerDetails?: { name: string; age: number; gender: string }[]
}): Promise<FulfillPaymentResult> {
  const payment = await PaymentModel.findOne({ razorpayOrderId: orderId })
  if (!payment) {
    return { success: false, code: 'PAYMENT_NOT_FOUND', message: 'Payment record not found for this order.' }
  }

  // Idempotency: if already completed, return existing booking without duplicate writes
  if (payment.status === 'completed') {
    const existingBooking = payment.bookingId ? await Booking.findById(payment.bookingId) : null
    return {
      success: true,
      message: 'Payment was already verified and booking confirmed.',
      booking: existingBooking,
      payment,
      alreadyProcessed: true,
    }
  }

  const session = await mongoose.startSession()
  let bookingDoc: InstanceType<typeof Booking> | null = null

  try {
    await session.withTransaction(async () => {
      const trip = await Trip.findById(payment.tripId).session(session)
      if (!trip) {
        throw new Error('Associated trip not found.')
      }

      const finalPassengers =
        passengerDetails && passengerDetails.length > 0
          ? passengerDetails
          : payment.passengerDetails && payment.passengerDetails.length > 0
          ? payment.passengerDetails
          : []

      const [createdBooking] = await Booking.create(
        [
          {
            userId: payment.userId,
            busId: trip.busId,
            tripId: payment.tripId,
            seatIds: payment.seatIds,
            passengerDetails: finalPassengers,
            status: 'confirmed',
            razorpayOrderId: orderId,
            razorpayPaymentId: paymentId,
          },
        ],
        { session }
      )
      bookingDoc = createdBooking

      payment.status = 'completed'
      payment.razorpayPaymentId = paymentId
      payment.bookingId = createdBooking._id as Types.ObjectId
      await payment.save({ session })

      await TripSeat.updateMany(
        {
          _id: { $in: payment.seatIds },
          tripId: payment.tripId,
        },
        {
          $set: {
            status: 'booked',
            lockedBy: null,
            lockedUntil: null,
            lockId: null,
          },
        },
        { session }
      )
    })
  } finally {
    await session.endSession()
  }

  // Real-time broadcast to all viewers on this trip
  if (global.io) {
    global.io.to(tripRoom(payment.tripId.toString())).emit('seatsUpdated', {
      tripId: payment.tripId.toString(),
      seatIds: payment.seatIds.map((id) => id.toString()),
      status: 'booked',
    })
  }

  return {
    success: true,
    message: 'Payment verified and booking confirmed successfully.',
    booking: bookingDoc,
    payment,
  }
}

// POST /create-order — create Razorpay order and pending Payment record
router.post('/create-order', auth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id
    if (!userId || !isValidObjectId(userId)) {
      return res.status(401).json({ success: false, message: 'Unauthorized. Please login again.' })
    }

    const { amount, tripId, seatIds, passengerDetails } = req.body as {
      amount?: number
      tripId?: string
      seatIds?: string[]
      passengerDetails?: { name: string; age: number; gender: string }[]
    }

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ success: false, message: 'A valid positive amount is required.' })
    }

    if (!tripId || !isValidObjectId(tripId)) {
      return res.status(400).json({ success: false, message: 'A valid tripId is required.' })
    }

    if (!Array.isArray(seatIds) || seatIds.length === 0 || !seatIds.every((id) => isValidObjectId(id))) {
      return res.status(400).json({ success: false, message: 'seatIds must be a non-empty array of valid IDs.' })
    }

    // Verify trip exists (populate bus & route for Razorpay notes)
    const trip = await Trip.findById(tripId).populate({
      path: 'busId',
      select: 'operator busNumber routesId',
      populate: { path: 'routesId', select: 'origin destination' },
    })
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found.' })
    }

    // Verify seats belong to this trip (populate physical seatNumber for Razorpay notes)
    const tripSeats = await TripSeat.find({
      _id: { $in: seatIds.map((id) => new Types.ObjectId(id)) },
      tripId: new Types.ObjectId(tripId),
    }).populate('seatId', 'seatNumber')

    if (tripSeats.length !== seatIds.length) {
      return res.status(400).json({ success: false, message: 'One or more seats do not belong to this trip.' })
    }

    // Check if any seats are already booked
    const alreadyBooked = tripSeats.some((s) => s.status === 'booked')
    if (alreadyBooked) {
      return res.status(400).json({ success: false, message: 'One or more selected seats are already booked.' })
    }

    const amountPaise = Math.round(amount * 100)
    const seatObjectIds = seatIds.map((id) => new Types.ObjectId(id))

    // 30 minutes order reuse window
    const ORDER_REUSE_TTL_MS = 30 * 60 * 1000
    const cutoffDate = new Date(Date.now() - ORDER_REUSE_TTL_MS)

    // 1. Mark older pending attempts for this user/trip as failed (garbage collection)
    await PaymentModel.updateMany(
      {
        userId: new Types.ObjectId(userId),
        tripId: new Types.ObjectId(tripId),
        status: 'pending',
        createdAt: { $lt: cutoffDate },
      },
      { $set: { status: 'failed' } }
    )

    // 2. Check if an active pending payment order already exists within 30 min
    const existingPayment = await PaymentModel.findOne({
      userId: new Types.ObjectId(userId),
      tripId: new Types.ObjectId(tripId),
      seatIds: { $all: seatObjectIds, $size: seatObjectIds.length },
      amountPaise,
      status: 'pending',
      createdAt: { $gte: cutoffDate },
    }).sort({ createdAt: -1 })

    if (existingPayment) {
      try {
        const existingOrder = await razorpay.orders.fetch(existingPayment.razorpayOrderId)
        if (existingOrder && (existingOrder.status === 'created' || existingOrder.status === 'attempted')) {
          return res.status(200).json({
            success: true,
            id: existingOrder.id,
            amount: existingOrder.amount,
            currency: existingOrder.currency,
            key: process.env.razorpay_key_id,
            paymentId: existingPayment._id,
            order: existingOrder,
            reused: true,
          })
        }
      } catch (fetchErr) {
        console.warn('Could not fetch existing Razorpay order, proceeding to create a new one:', fetchErr)
      }
    }

    // 3. Otherwise create a new Razorpay Order (include bus & seat metadata in notes)
    const bus = trip.busId as unknown as {
      operator?: string
      busNumber?: string
      routesId?: { origin?: string; destination?: string }
    } | null

    const seatNumbers = tripSeats.map(
      (ts, idx) => (ts.seatId as unknown as { seatNumber?: string } | null)?.seatNumber || `Seat ${idx + 1}`
    )

    const options = {
      amount: amountPaise,
      currency: 'INR',
      receipt: `rcpt_${Date.now()}_${userId.toString().slice(-4)}`,
      notes: {
        tripId: trip._id.toString(),
        operator: bus?.operator || '',
        busNumber: bus?.busNumber || '',
        route: bus?.routesId ? `${bus.routesId.origin} to ${bus.routesId.destination}` : '',
        seats: seatNumbers.join(', '),
      },
    }

    const order = await razorpay.orders.create(options)

    // Save pending Payment in database with passengerDetails for webhook resilience
    const payment = new PaymentModel({
      userId: new Types.ObjectId(userId),
      tripId: new Types.ObjectId(tripId),
      seatIds: seatIds.map((id) => new Types.ObjectId(id)),
      amountPaise,
      currency: 'INR',
      razorpayOrderId: order.id,
      status: 'pending',
      passengerDetails: passengerDetails || [],
    })

    await payment.save()

    return res.status(201).json({
      success: true,
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      key: process.env.razorpay_key_id,
      paymentId: payment._id,
      order,
    })
  } catch (error) {
    const err = error as Error
    console.error('Error creating payment order:', err.message)
    return res.status(500).json({ success: false, message: 'Failed to create payment order.', error: err.message })
  }
})

// POST /verify — verify Razorpay payment signature and complete booking (client-driven)
router.post('/verify', auth, async (req: AuthRequest, res: Response) => {
  const userId = req.user?._id
  if (!userId || !isValidObjectId(userId)) {
    return res.status(401).json({ success: false, message: 'Unauthorized. Please login again.' })
  }

  const {
    razorpayOrderId,
    razorpay_order_id,
    razorpayPaymentId,
    razorpay_payment_id,
    razorpaySignature,
    razorpay_signature,
    passengerDetails,
  } = req.body as {
    razorpayOrderId?: string
    razorpay_order_id?: string
    razorpayPaymentId?: string
    razorpay_payment_id?: string
    razorpaySignature?: string
    razorpay_signature?: string
    passengerDetails?: { name: string; age: number; gender: string }[]
  }

  const orderId = razorpayOrderId || razorpay_order_id
  const paymentId = razorpayPaymentId || razorpay_payment_id
  const signature = razorpaySignature || razorpay_signature

  if (!orderId || !paymentId || !signature) {
    return res.status(400).json({
      success: false,
      message: 'Missing required payment verification details (orderId, paymentId, signature).',
    })
  }

  try {
    const payment = await PaymentModel.findOne({ razorpayOrderId: orderId })
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment record not found for this order.' })
    }

    if (payment.userId.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied. You do not own this payment record.' })
    }

    // Verify Razorpay HMAC SHA256 signature
    const secret = process.env.razorpay_key_secret
    if (!secret) {
      console.error('Razorpay key secret is not configured in environment variables.')
      return res.status(500).json({ success: false, message: 'Payment gateway configuration error.' })
    }

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex')

    if (expectedSignature !== signature) {
      payment.status = 'failed'
      payment.razorpayPaymentId = paymentId
      await payment.save()
      return res.status(400).json({ success: false, message: 'Invalid payment signature. Verification failed.' })
    }

    // Fulfill booking via shared idempotent function
    const result = await fulfillPayment({ orderId, paymentId, passengerDetails })
    if (!result.success) {
      return res.status(500).json(result)
    }

    return res.status(200).json(result)
  } catch (error) {
    const err = error as Error
    console.error('Payment verification error:', err.message)
    return res.status(500).json({ success: false, message: 'Payment verification failed.', error: err.message })
  }
})

// POST /webhook — server-to-server webhook endpoint called directly by Razorpay
router.post('/webhook', async (req: Request, res: Response) => {
  const signature = req.headers['x-razorpay-signature'] as string
  if (!signature) {
    return res.status(400).json({ success: false, message: 'Missing Razorpay signature header.' })
  }

  const secret = process.env.razorpay_webhook_secret || process.env.razorpay_key_secret
  if (!secret) {
    console.error('[Webhook] Missing webhook secret in configuration.')
    return res.status(500).json({ success: false, message: 'Server webhook configuration error.' })
  }

  try {
    // Verify HMAC-SHA256 signature on the raw payload buffer
    const rawBody = (req as any).rawBody || JSON.stringify(req.body)
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex')

    if (expectedSignature !== signature) {
      console.warn('[Webhook] Signature mismatch on incoming Razorpay webhook.')
      return res.status(400).json({ success: false, message: 'Invalid webhook signature.' })
    }

    const event = req.body?.event as string
    console.log(`[Webhook] Verified Razorpay event: ${event}`)

    if (event === 'order.paid' || event === 'payment.captured') {
      const orderEntity = req.body.payload?.order?.entity
      const paymentEntity = req.body.payload?.payment?.entity

      const orderId = orderEntity?.id || paymentEntity?.order_id
      const paymentId = paymentEntity?.id

      if (orderId && paymentId) {
        const result = await fulfillPayment({ orderId, paymentId })
        console.log(`[Webhook] Fulfill result for ${orderId}:`, result.message)
      }
    } else if (event === 'payment.failed') {
      const paymentEntity = req.body.payload?.payment?.entity
      const orderId = paymentEntity?.order_id
      if (orderId) {
        await PaymentModel.updateOne(
          { razorpayOrderId: orderId, status: 'pending' },
          { $set: { status: 'failed', razorpayPaymentId: paymentEntity?.id } }
        )
        console.log(`[Webhook] Marked payment as failed for order: ${orderId}`)
      }
    }

    // Razorpay requires a 200 OK response to acknowledge receipt
    return res.status(200).json({ status: 'ok' })
  } catch (error) {
    const err = error as Error
    console.error('[Webhook] Processing error:', err.message)
    // Return 200 to prevent Razorpay storming retries if it's an internal validation issue, or 500 if transient
    return res.status(500).json({ success: false, error: err.message })
  }
})

// GET /my-payments — get payment history for authenticated user
router.get('/my-payments', auth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id
    if (!userId || !isValidObjectId(userId)) {
      return res.status(401).json({ success: false, message: 'Unauthorized.' })
    }

    const payments = await PaymentModel.find({ userId })
      .sort({ createdAt: -1 })
      .populate('tripId')
      .populate('bookingId')
      .lean()

    return res.json({ success: true, data: payments })
  } catch (error) {
    const err = error as Error
    return res.status(500).json({ success: false, message: 'Failed to fetch payments.', error: err.message })
  }
})

// GET /:id — get single payment details by Payment ID
router.get('/:id', auth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid payment ID.' })
    }

    const payment = await PaymentModel.findById(id).populate('tripId').populate('bookingId')
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found.' })
    }

    if (payment.userId.toString() !== req.user?._id.toString() && !req.user?.isAdmin) {
      return res.status(403).json({ success: false, message: 'Access denied.' })
    }

    return res.json({ success: true, data: payment })
  } catch (error) {
    const err = error as Error
    return res.status(500).json({ success: false, message: 'Failed to fetch payment.', error: err.message })
  }
})

export default router
