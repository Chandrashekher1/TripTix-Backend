"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fulfillPayment = fulfillPayment;
const crypto_1 = __importDefault(require("crypto"));
const express_1 = __importDefault(require("express"));
const mongoose_1 = __importStar(require("mongoose"));
const auth_1 = __importDefault(require("../middleware/auth"));
const razorpay_1 = __importDefault(require("../config/razorpay"));
const payment_1 = require("../models/payment");
const trip_1 = require("../models/trip");
const tripSeat_1 = require("../models/tripSeat");
const booking_1 = require("../models/booking");
const socket_1 = require("./socket");
const router = express_1.default.Router();
/**
 * Shared atomic fulfillment function used by both client /verify and server-to-server /webhook.
 * Ensures strict idempotency: if already fulfilled, skips writes and returns existing booking.
 */
async function fulfillPayment({ orderId, paymentId, passengerDetails, }) {
    const payment = await payment_1.PaymentModel.findOne({ razorpayOrderId: orderId });
    if (!payment) {
        return { success: false, code: 'PAYMENT_NOT_FOUND', message: 'Payment record not found for this order.' };
    }
    // Idempotency: if already completed, return existing booking without duplicate writes
    if (payment.status === 'completed') {
        const existingBooking = payment.bookingId ? await booking_1.Booking.findById(payment.bookingId) : null;
        return {
            success: true,
            message: 'Payment was already verified and booking confirmed.',
            booking: existingBooking,
            payment,
            alreadyProcessed: true,
        };
    }
    const session = await mongoose_1.default.startSession();
    let bookingDoc = null;
    try {
        await session.withTransaction(async () => {
            const trip = await trip_1.Trip.findById(payment.tripId).session(session);
            if (!trip) {
                throw new Error('Associated trip not found.');
            }
            const finalPassengers = passengerDetails && passengerDetails.length > 0
                ? passengerDetails
                : payment.passengerDetails && payment.passengerDetails.length > 0
                    ? payment.passengerDetails
                    : [];
            const [createdBooking] = await booking_1.Booking.create([
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
            ], { session });
            bookingDoc = createdBooking;
            payment.status = 'completed';
            payment.razorpayPaymentId = paymentId;
            payment.bookingId = createdBooking._id;
            await payment.save({ session });
            await tripSeat_1.TripSeat.updateMany({
                _id: { $in: payment.seatIds },
                tripId: payment.tripId,
            }, {
                $set: {
                    status: 'booked',
                    lockedBy: null,
                    lockedUntil: null,
                    lockId: null,
                },
            }, { session });
        });
    }
    finally {
        await session.endSession();
    }
    // Real-time broadcast to all viewers on this trip
    if (global.io) {
        global.io.to((0, socket_1.tripRoom)(payment.tripId.toString())).emit('seatsUpdated', {
            tripId: payment.tripId.toString(),
            seatIds: payment.seatIds.map((id) => id.toString()),
            status: 'booked',
        });
    }
    return {
        success: true,
        message: 'Payment verified and booking confirmed successfully.',
        booking: bookingDoc,
        payment,
    };
}
// POST /create-order — create Razorpay order and pending Payment record
router.post('/create-order', auth_1.default, async (req, res) => {
    try {
        const userId = req.user?._id;
        if (!userId || !(0, mongoose_1.isValidObjectId)(userId)) {
            return res.status(401).json({ success: false, message: 'Unauthorized. Please login again.' });
        }
        const { amount, tripId, seatIds, passengerDetails } = req.body;
        if (!amount || typeof amount !== 'number' || amount <= 0) {
            return res.status(400).json({ success: false, message: 'A valid positive amount is required.' });
        }
        if (!tripId || !(0, mongoose_1.isValidObjectId)(tripId)) {
            return res.status(400).json({ success: false, message: 'A valid tripId is required.' });
        }
        if (!Array.isArray(seatIds) || seatIds.length === 0 || !seatIds.every((id) => (0, mongoose_1.isValidObjectId)(id))) {
            return res.status(400).json({ success: false, message: 'seatIds must be a non-empty array of valid IDs.' });
        }
        // Verify trip exists (populate bus & route for Razorpay notes)
        const trip = await trip_1.Trip.findById(tripId).populate({
            path: 'busId',
            select: 'operator busNumber routesId',
            populate: { path: 'routesId', select: 'origin destination' },
        });
        if (!trip) {
            return res.status(404).json({ success: false, message: 'Trip not found.' });
        }
        // Verify seats belong to this trip (populate physical seatNumber for Razorpay notes)
        const tripSeats = await tripSeat_1.TripSeat.find({
            _id: { $in: seatIds.map((id) => new mongoose_1.Types.ObjectId(id)) },
            tripId: new mongoose_1.Types.ObjectId(tripId),
        }).populate('seatId', 'seatNumber');
        if (tripSeats.length !== seatIds.length) {
            return res.status(400).json({ success: false, message: 'One or more seats do not belong to this trip.' });
        }
        // Check if any seats are already booked
        const alreadyBooked = tripSeats.some((s) => s.status === 'booked');
        if (alreadyBooked) {
            return res.status(400).json({ success: false, message: 'One or more selected seats are already booked.' });
        }
        const amountPaise = Math.round(amount * 100);
        const seatObjectIds = seatIds.map((id) => new mongoose_1.Types.ObjectId(id));
        // 30 minutes order reuse window
        const ORDER_REUSE_TTL_MS = 30 * 60 * 1000;
        const cutoffDate = new Date(Date.now() - ORDER_REUSE_TTL_MS);
        // 1. Mark older pending attempts for this user/trip as failed (garbage collection)
        await payment_1.PaymentModel.updateMany({
            userId: new mongoose_1.Types.ObjectId(userId),
            tripId: new mongoose_1.Types.ObjectId(tripId),
            status: 'pending',
            createdAt: { $lt: cutoffDate },
        }, { $set: { status: 'failed' } });
        // 2. Check if an active pending payment order already exists within 30 min
        const existingPayment = await payment_1.PaymentModel.findOne({
            userId: new mongoose_1.Types.ObjectId(userId),
            tripId: new mongoose_1.Types.ObjectId(tripId),
            seatIds: { $all: seatObjectIds, $size: seatObjectIds.length },
            amountPaise,
            status: 'pending',
            createdAt: { $gte: cutoffDate },
        }).sort({ createdAt: -1 });
        if (existingPayment) {
            try {
                const existingOrder = await razorpay_1.default.orders.fetch(existingPayment.razorpayOrderId);
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
                    });
                }
            }
            catch (fetchErr) {
                console.warn('Could not fetch existing Razorpay order, proceeding to create a new one:', fetchErr);
            }
        }
        // 3. Otherwise create a new Razorpay Order (include bus & seat metadata in notes)
        const bus = trip.busId;
        const seatNumbers = tripSeats.map((ts, idx) => ts.seatId?.seatNumber || `Seat ${idx + 1}`);
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
        };
        const order = await razorpay_1.default.orders.create(options);
        // Save pending Payment in database with passengerDetails for webhook resilience
        const payment = new payment_1.PaymentModel({
            userId: new mongoose_1.Types.ObjectId(userId),
            tripId: new mongoose_1.Types.ObjectId(tripId),
            seatIds: seatIds.map((id) => new mongoose_1.Types.ObjectId(id)),
            amountPaise,
            currency: 'INR',
            razorpayOrderId: order.id,
            status: 'pending',
            passengerDetails: passengerDetails || [],
        });
        await payment.save();
        return res.status(201).json({
            success: true,
            id: order.id,
            amount: order.amount,
            currency: order.currency,
            key: process.env.razorpay_key_id,
            paymentId: payment._id,
            order,
        });
    }
    catch (error) {
        const err = error;
        console.error('Error creating payment order:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to create payment order.', error: err.message });
    }
});
// POST /verify — verify Razorpay payment signature and complete booking (client-driven)
router.post('/verify', auth_1.default, async (req, res) => {
    const userId = req.user?._id;
    if (!userId || !(0, mongoose_1.isValidObjectId)(userId)) {
        return res.status(401).json({ success: false, message: 'Unauthorized. Please login again.' });
    }
    const { razorpayOrderId, razorpay_order_id, razorpayPaymentId, razorpay_payment_id, razorpaySignature, razorpay_signature, passengerDetails, } = req.body;
    const orderId = razorpayOrderId || razorpay_order_id;
    const paymentId = razorpayPaymentId || razorpay_payment_id;
    const signature = razorpaySignature || razorpay_signature;
    if (!orderId || !paymentId || !signature) {
        return res.status(400).json({
            success: false,
            message: 'Missing required payment verification details (orderId, paymentId, signature).',
        });
    }
    try {
        const payment = await payment_1.PaymentModel.findOne({ razorpayOrderId: orderId });
        if (!payment) {
            return res.status(404).json({ success: false, message: 'Payment record not found for this order.' });
        }
        if (payment.userId.toString() !== userId.toString()) {
            return res.status(403).json({ success: false, message: 'Access denied. You do not own this payment record.' });
        }
        // Verify Razorpay HMAC SHA256 signature
        const secret = process.env.razorpay_key_secret;
        if (!secret) {
            console.error('Razorpay key secret is not configured in environment variables.');
            return res.status(500).json({ success: false, message: 'Payment gateway configuration error.' });
        }
        const expectedSignature = crypto_1.default
            .createHmac('sha256', secret)
            .update(`${orderId}|${paymentId}`)
            .digest('hex');
        if (expectedSignature !== signature) {
            payment.status = 'failed';
            payment.razorpayPaymentId = paymentId;
            await payment.save();
            return res.status(400).json({ success: false, message: 'Invalid payment signature. Verification failed.' });
        }
        // Fulfill booking via shared idempotent function
        const result = await fulfillPayment({ orderId, paymentId, passengerDetails });
        if (!result.success) {
            return res.status(500).json(result);
        }
        return res.status(200).json(result);
    }
    catch (error) {
        const err = error;
        console.error('Payment verification error:', err.message);
        return res.status(500).json({ success: false, message: 'Payment verification failed.', error: err.message });
    }
});
// POST /webhook — server-to-server webhook endpoint called directly by Razorpay
router.post('/webhook', async (req, res) => {
    const signature = req.headers['x-razorpay-signature'];
    if (!signature) {
        return res.status(400).json({ success: false, message: 'Missing Razorpay signature header.' });
    }
    const secret = process.env.razorpay_webhook_secret || process.env.razorpay_key_secret;
    if (!secret) {
        console.error('[Webhook] Missing webhook secret in configuration.');
        return res.status(500).json({ success: false, message: 'Server webhook configuration error.' });
    }
    try {
        // Verify HMAC-SHA256 signature on the raw payload buffer
        const rawBody = req.rawBody || JSON.stringify(req.body);
        const expectedSignature = crypto_1.default
            .createHmac('sha256', secret)
            .update(rawBody)
            .digest('hex');
        if (expectedSignature !== signature) {
            console.warn('[Webhook] Signature mismatch on incoming Razorpay webhook.');
            return res.status(400).json({ success: false, message: 'Invalid webhook signature.' });
        }
        const event = req.body?.event;
        console.log(`[Webhook] Verified Razorpay event: ${event}`);
        if (event === 'order.paid' || event === 'payment.captured') {
            const orderEntity = req.body.payload?.order?.entity;
            const paymentEntity = req.body.payload?.payment?.entity;
            const orderId = orderEntity?.id || paymentEntity?.order_id;
            const paymentId = paymentEntity?.id;
            if (orderId && paymentId) {
                const result = await fulfillPayment({ orderId, paymentId });
                console.log(`[Webhook] Fulfill result for ${orderId}:`, result.message);
            }
        }
        else if (event === 'payment.failed') {
            const paymentEntity = req.body.payload?.payment?.entity;
            const orderId = paymentEntity?.order_id;
            if (orderId) {
                await payment_1.PaymentModel.updateOne({ razorpayOrderId: orderId, status: 'pending' }, { $set: { status: 'failed', razorpayPaymentId: paymentEntity?.id } });
                console.log(`[Webhook] Marked payment as failed for order: ${orderId}`);
            }
        }
        // Razorpay requires a 200 OK response to acknowledge receipt
        return res.status(200).json({ status: 'ok' });
    }
    catch (error) {
        const err = error;
        console.error('[Webhook] Processing error:', err.message);
        // Return 200 to prevent Razorpay storming retries if it's an internal validation issue, or 500 if transient
        return res.status(500).json({ success: false, error: err.message });
    }
});
// GET /my-payments — get payment history for authenticated user
router.get('/my-payments', auth_1.default, async (req, res) => {
    try {
        const userId = req.user?._id;
        if (!userId || !(0, mongoose_1.isValidObjectId)(userId)) {
            return res.status(401).json({ success: false, message: 'Unauthorized.' });
        }
        const payments = await payment_1.PaymentModel.find({ userId })
            .sort({ createdAt: -1 })
            .populate('tripId')
            .populate('bookingId')
            .lean();
        return res.json({ success: true, data: payments });
    }
    catch (error) {
        const err = error;
        return res.status(500).json({ success: false, message: 'Failed to fetch payments.', error: err.message });
    }
});
// GET /:id — get single payment details by Payment ID
router.get('/:id', auth_1.default, async (req, res) => {
    try {
        const { id } = req.params;
        if (!(0, mongoose_1.isValidObjectId)(id)) {
            return res.status(400).json({ success: false, message: 'Invalid payment ID.' });
        }
        const payment = await payment_1.PaymentModel.findById(id).populate('tripId').populate('bookingId');
        if (!payment) {
            return res.status(404).json({ success: false, message: 'Payment not found.' });
        }
        if (payment.userId.toString() !== req.user?._id.toString() && !req.user?.isAdmin) {
            return res.status(403).json({ success: false, message: 'Access denied.' });
        }
        return res.json({ success: true, data: payment });
    }
    catch (error) {
        const err = error;
        return res.status(500).json({ success: false, message: 'Failed to fetch payment.', error: err.message });
    }
});
exports.default = router;
//# sourceMappingURL=payment.js.map