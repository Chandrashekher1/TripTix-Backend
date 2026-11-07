"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = __importDefault(require("../middleware/auth"));
const booking_1 = require("../models/booking");
const router = express_1.default.Router();
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