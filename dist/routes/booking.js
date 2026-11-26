"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const mongoose_1 = require("mongoose");
const auth_1 = __importDefault(require("../middleware/auth"));
const booking_1 = require("../models/booking");
const invoiceService_1 = require("../services/invoiceService");
const router = express_1.default.Router();
// GET /my-bookings — list authenticated user's bookings with bus, route, trip, and seat numbers
router.get('/my-bookings', auth_1.default, async (req, res) => {
    try {
        const userId = req.user?._id;
        if (!userId || !(0, mongoose_1.isValidObjectId)(userId)) {
            return res.status(401).json({ success: false, message: 'Unauthorized.' });
        }
        const bookings = await booking_1.Booking.find({ userId })
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
            .lean();
        return res.json({ success: true, data: bookings });
    }
    catch (err) {
        const error = err;
        console.error('Error fetching user bookings:', error.message);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});
// GET /:id/invoice — download PDF invoice (or ?format=json for structured invoice data)
router.get('/:id/invoice', auth_1.default, async (req, res) => {
    try {
        const id = req.params.id;
        if (!(0, mongoose_1.isValidObjectId)(id)) {
            return res.status(400).json({ success: false, message: 'Invalid booking ID.' });
        }
        const userId = req.user?._id;
        if (!userId || !(0, mongoose_1.isValidObjectId)(userId)) {
            return res.status(401).json({ success: false, message: 'Unauthorized.' });
        }
        const invoiceData = await (0, invoiceService_1.getBookingInvoiceData)(id, userId, Boolean(req.user?.isAdmin));
        if (req.query.format === 'json') {
            return res.json({ success: true, data: invoiceData });
        }
        const pdfBuffer = await (0, invoiceService_1.generateInvoicePdfBuffer)(invoiceData);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="TripTix-${invoiceData.invoiceNumber}.pdf"`);
        res.setHeader('Content-Length', pdfBuffer.length);
        return res.send(pdfBuffer);
    }
    catch (err) {
        if (err instanceof invoiceService_1.InvoiceError) {
            return res.status(err.statusCode).json({ success: false, message: err.message });
        }
        const error = err;
        console.error('Error generating invoice:', error.message);
        return res.status(500).json({ success: false, message: 'Failed to generate invoice.' });
    }
});
// POST /book — create a booking
router.post('/book', auth_1.default, async (req, res) => {
    try {
        const { userId, busId, passengerDetails, seatIds } = req.body;
        if (!userId || !busId || !passengerDetails?.length || !seatIds?.length) {
            return res.status(400).json({ success: false, message: 'Missing fields' });
        }
        const booking = new booking_1.Booking({ userId, busId, passengerDetails, seatIds });
        await booking.save();
        return res.status(201).json({ success: true, message: 'Booking confirmed', booking });
    }
    catch (err) {
        const error = err;
        console.error(error.message);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});
exports.default = router;
//# sourceMappingURL=booking.js.map