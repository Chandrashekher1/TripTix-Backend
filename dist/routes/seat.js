"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const mongoose_1 = require("mongoose");
const auth_1 = __importDefault(require("../middleware/auth"));
const admin_1 = __importDefault(require("../middleware/admin"));
const seat_1 = require("../models/seat");
const tripSeat_1 = require("../models/tripSeat");
const router = express_1.default.Router();
router.get('/trip/:tripId', async (req, res) => {
    try {
        const tripId = req.params.tripId;
        if (!(0, mongoose_1.isValidObjectId)(tripId)) {
            return res.status(400).json({ error: 'Invalid trip ID' });
        }
        const tripSeats = await tripSeat_1.TripSeat.find({ tripId })
            .select('_id status seatId lockedUntil')
            .populate('seatId', 'seatNumber seatPreference')
            .lean();
        if (tripSeats.length === 0) {
            return res.status(404).json({ message: 'No seats found for this trip.' });
        }
        const now = Date.now();
        const data = tripSeats.map((ts) => {
            const seat = ts.seatId;
            const expired = ts.status === 'locked' && ts.lockedUntil && ts.lockedUntil.getTime() <= now;
            return {
                _id: ts._id,
                seatNumber: seat?.seatNumber,
                seatPreference: seat?.seatPreference,
                status: expired ? 'available' : ts.status,
            };
        });
        return res.json({ success: true, data });
    }
    catch (err) {
        const error = err;
        return res.status(500).json({ message: 'Internal Server error', error: error.message });
    }
});
// GET /:id — get all seats for a bus (public: allow guests to view and select seats)
router.get('/:id', async (req, res) => {
    try {
        const busId = req.params.id;
        if (!(0, mongoose_1.isValidObjectId)(busId)) {
            return res.status(400).json({ error: 'Invalid bus ID' });
        }
        const seats = await seat_1.Seat.find({ busId }).select('_id seatNumber status seatPreference busId');
        if (!seats || seats.length === 0) {
            return res.status(404).json({ message: 'No seats found for this bus.' });
        }
        return res.json({ success: true, data: seats });
    }
    catch (err) {
        const error = err;
        return res.status(500).json({ message: 'Internal Server error', error: error.message });
    }
});
// POST /add — create a seat (admin)
router.post('/add', [auth_1.default, admin_1.default], async (req, res) => {
    try {
        const { seatNumber, seatPreference, busId } = req.body;
        if (!seatNumber || !seatPreference || !busId) {
            return res.status(400).json({ message: 'Missing required fields.' });
        }
        if (!(0, mongoose_1.isValidObjectId)(busId)) {
            return res.status(400).json({ message: 'Invalid bus ID.' });
        }
        const seat = await seat_1.Seat.create({ seatNumber, seatPreference, busId });
        return res.status(201).json({ message: 'Seat created successfully', seat });
    }
    catch (err) {
        const error = err;
        if (error.code === 11000) {
            return res.status(409).json({ message: 'A seat with this number already exists for this bus.' });
        }
        return res.status(500).json({ error: error.message });
    }
});
router.patch('/:id', [auth_1.default, admin_1.default], async (req, res) => {
    try {
        if (!(0, mongoose_1.isValidObjectId)(req.params.id)) {
            return res.status(400).json({ message: 'Invalid seat ID.' });
        }
        const { seatNumber, seatPreference } = req.body;
        const update = {};
        if (seatNumber !== undefined)
            update.seatNumber = seatNumber;
        if (seatPreference !== undefined)
            update.seatPreference = seatPreference;
        if (Object.keys(update).length === 0) {
            return res.status(400).json({ message: 'seatNumber or seatPreference is required.' });
        }
        const seat = await seat_1.Seat.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
        if (!seat)
            return res.status(404).json({ message: 'Seat not found.' });
        return res.json({ success: true, data: seat });
    }
    catch (err) {
        const error = err;
        if (error.code === 11000) {
            return res.status(409).json({ message: 'A seat with this number already exists for this bus.' });
        }
        return res.status(500).json({ error: error.message });
    }
});
router.delete('/:id', [auth_1.default, admin_1.default], async (req, res) => {
    try {
        if (!(0, mongoose_1.isValidObjectId)(req.params.id)) {
            return res.status(400).json({ message: 'Invalid seat ID.' });
        }
        const seat = await seat_1.Seat.findByIdAndDelete(req.params.id);
        if (!seat)
            return res.status(404).json({ message: 'Seat not found.' });
        return res.json({ success: true, message: 'Seat deleted successfully.' });
    }
    catch (err) {
        const error = err;
        return res.status(500).json({ error: error.message });
    }
});
exports.default = router;
//# sourceMappingURL=seat.js.map