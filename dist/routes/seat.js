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
const router = express_1.default.Router();
// GET /:id — get all seats for a bus
router.get('/:id', [auth_1.default], async (req, res) => {
    try {
        const busId = req.params.id;
        if (!(0, mongoose_1.isValidObjectId)(busId)) {
            return res.status(400).json({ error: 'Invalid bus ID' });
        }
        const seats = await seat_1.Seat.find({ busId });
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
        const { seatNumber, status, seatPreference, busId, userId } = req.body;
        if (!seatNumber || !status || !seatPreference || !busId || !userId) {
            return res.status(400).json({ message: 'Missing required fields.' });
        }
        const seat = new seat_1.Seat({ seatNumber, status, seatPreference, busId, userId });
        await seat.save();
        return res.status(201).json({ message: 'Seat created successfully', seat });
    }
    catch (err) {
        const error = err;
        return res.status(500).json({ error: error.message });
    }
});
exports.default = router;
//# sourceMappingURL=seat.js.map