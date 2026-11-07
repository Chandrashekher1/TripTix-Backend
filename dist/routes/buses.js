"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const mongoose_1 = require("mongoose");
const auth_1 = __importDefault(require("../middleware/auth"));
const admin_1 = __importDefault(require("../middleware/admin"));
const storage_1 = require("../config/storage");
const buses_1 = __importDefault(require("../models/buses"));
const seat_1 = require("../models/seat");
const routes_1 = require("../models/routes");
const router = express_1.default.Router();
// GET /topRated — all buses with routes populated
router.get('/topRated', async (_req, res) => {
    try {
        const buses = await buses_1.default.find().populate('routesId');
        if (!buses)
            return res.status(404).json({ message: 'Route not found' });
        return res.json(buses);
    }
    catch (err) {
        const error = err;
        return res.status(500).json({ success: false, message: 'Internal server error.', error: error.message });
    }
});
// GET / — search buses by origin, destination, date
router.get('/', async (req, res) => {
    try {
        const { origin, destination } = req.query;
        if (!origin || !destination) {
            return res.status(400).json({ message: 'Missing required fields: origin, destination, date' });
        }
        const route = await routes_1.Routes.findOne({ origin, destination });
        if (!route)
            return res.status(404).json({ message: 'Route not found' });
        const rawBuses = await buses_1.default.find({ routesId: route._id });
        const buses = rawBuses;
        for (const bus of buses) {
            bus.availableSeats = await seat_1.Seat.countDocuments({ busId: bus._id, status: 'available' });
        }
        return res.json(buses);
    }
    catch (err) {
        const error = err;
        return res.status(500).json({ success: false, message: 'Internal server error.', error: error.message });
    }
});
// GET /:id — get bus by id
router.get('/:id', async (req, res) => {
    try {
        const busId = req.params.id;
        if (!mongoose_1.Types.ObjectId.isValid(busId)) {
            return res.status(400).json({ message: 'Invalid bus ID' });
        }
        const bus = await buses_1.default.findById(busId).populate('routesId');
        return res.json(bus);
    }
    catch {
        return res.status(500).json({ success: false, message: 'Internal Server error.' });
    }
});
// POST / — add new bus (admin)
router.post('/', [auth_1.default, admin_1.default], storage_1.uploadMultiple, async (req, res) => {
    try {
        const { routesId, busNumber, busType, operator, dep_time, arrivalTime, isAc, isSleeper, isSeater, price, totalSeat, rating, isWifi, } = req.body;
        if (!routesId || !busNumber || !busType || !operator || !dep_time || !arrivalTime || !price || !totalSeat) {
            return res.status(400).json({ message: 'Missing required fields' });
        }
        if (!mongoose_1.Types.ObjectId.isValid(routesId)) {
            return res.status(400).json({ message: 'Invalid route ID' });
        }
        const files = req.files;
        const image = files?.map((f) => f.path);
        let bus = new buses_1.default({
            routesId: new mongoose_1.Types.ObjectId(routesId),
            busNumber, busType, operator,
            isAc: isAc === 'true', isSeater: isSeater === 'true',
            isSleeper: isSleeper === 'true', isWifi: isWifi === 'true',
            price: parseFloat(price),
            totalSeat,
            rating: parseFloat(rating) || 1,
            dep_time: new Date(dep_time),
            arrivalTime: new Date(arrivalTime),
            images: image,
        });
        bus = await bus.save();
        console.log(bus);
        return res.status(200).json({ success: true, message: 'Bus added successfully', data: bus });
    }
    catch (err) {
        const error = err;
        console.error(error);
        return res.status(500).json({ success: false, message: 'Internal Server error', error: error.message });
    }
});
// PATCH /:id — update bus (admin)
router.patch('/:id', [auth_1.default, admin_1.default], async (req, res) => {
    try {
        const { routesId, busNumber, busType, operator, dep_time, arrivalTime, isAc, isSleeper, isSeater, price, totalSeat, } = req.body;
        if (routesId && !mongoose_1.Types.ObjectId.isValid(routesId)) {
            return res.status(400).json({ message: 'Invalid route ID' });
        }
        const files = req.files;
        const image = files?.map((f) => f.path);
        const bus = await buses_1.default.findByIdAndUpdate(req.params.id, {
            routesId: routesId ? new mongoose_1.Types.ObjectId(routesId) : undefined,
            busNumber, busType, operator,
            isAc: isAc === 'true', isSeater: isSeater === 'true', isSleeper: isSleeper === 'true',
            price: parseFloat(price),
            totalSeat,
            dep_time: new Date(dep_time),
            arrivalTime: new Date(arrivalTime),
            images: image,
        }, { new: true });
        if (!bus)
            return res.status(400).json({ message: 'Something went wrong.' });
        return res.status(200).json({ success: true, message: 'Bus updated successfully', data: bus });
    }
    catch (err) {
        const error = err;
        return res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
});
// DELETE /:id — delete bus (admin)
router.delete('/:id', [auth_1.default, admin_1.default], async (req, res) => {
    try {
        const bus = await buses_1.default.findByIdAndDelete(req.params.id);
        if (!bus)
            return res.status(400).json({ message: 'No bus found with this Id' });
        return res.send(bus);
    }
    catch (err) {
        const error = err;
        return res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
});
exports.default = router;
//# sourceMappingURL=buses.js.map