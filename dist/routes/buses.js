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
function normalizeBoolean(value) {
    if (value === true || value === 'true')
        return true;
    if (value === false || value === 'false')
        return false;
    return undefined;
}
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
            return res.status(400).json({ message: 'Missing required fields: origin, destination' });
        }
        const normalizedOrigin = origin.trim().toLowerCase();
        const normalizedDestination = destination.trim().toLowerCase();
        const route = await routes_1.Routes.findOne({ origin: normalizedOrigin, destination: normalizedDestination });
        if (!route)
            return res.status(404).json({ message: 'Route not found' });
        const rawBuses = await buses_1.default.find({ routesId: route._id }).populate('routesId');
        const buses = rawBuses.map((bus) => bus.toObject());
        await Promise.all(buses.map(async (bus) => {
            bus.availableSeats = await seat_1.Seat.countDocuments({ busId: bus._id, status: 'available' });
        }));
        return res.json(buses);
    }
    catch (err) {
        const error = err;
        return res.status(500).json({ success: false, message: 'Internal server error.', error: error.message });
    }
});
router.get('/admin/all', [auth_1.default, admin_1.default], async (_req, res) => {
    try {
        const buses = await buses_1.default.find().populate('routesId');
        return res.json({ success: true, data: buses });
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
            isAc: normalizeBoolean(isAc) ?? false, isSeater: normalizeBoolean(isSeater) ?? false,
            isSleeper: normalizeBoolean(isSleeper) ?? false, isWifi: normalizeBoolean(isWifi) ?? false,
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
        const busId = req.params.id;
        if (!mongoose_1.Types.ObjectId.isValid(busId)) {
            return res.status(400).json({ message: 'Invalid bus ID' });
        }
        const body = req.body;
        const update = {};
        if (body.routesId !== undefined) {
            if (typeof body.routesId !== 'string' || !mongoose_1.Types.ObjectId.isValid(body.routesId)) {
                return res.status(400).json({ message: 'Invalid route ID' });
            }
            update.routesId = new mongoose_1.Types.ObjectId(body.routesId);
        }
        for (const field of ['busNumber', 'busType', 'operator', 'totalSeat']) {
            if (body[field] !== undefined)
                update[field] = body[field];
        }
        for (const field of ['isAc', 'isSeater', 'isSleeper', 'isWifi']) {
            if (body[field] !== undefined) {
                const value = normalizeBoolean(body[field]);
                if (value === undefined)
                    return res.status(400).json({ message: `Invalid ${field} value` });
                update[field] = value;
            }
        }
        if (body.price !== undefined) {
            const price = typeof body.price === 'number' ? body.price : Number(body.price);
            if (!Number.isFinite(price))
                return res.status(400).json({ message: 'Invalid price' });
            update.price = price;
        }
        for (const field of ['dep_time', 'arrivalTime']) {
            if (body[field] !== undefined) {
                const date = new Date(String(body[field]));
                if (Number.isNaN(date.getTime()))
                    return res.status(400).json({ message: `Invalid ${field}` });
                update[field] = date;
            }
        }
        if (Object.keys(update).length === 0) {
            return res.status(400).json({ message: 'No valid fields provided for update' });
        }
        const bus = await buses_1.default.findByIdAndUpdate(busId, update, { new: true, runValidators: true });
        if (!bus)
            return res.status(404).json({ message: 'No bus found with this ID' });
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
        console.log(bus);
        return res.send(bus);
    }
    catch (err) {
        const error = err;
        return res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
});
exports.default = router;
//# sourceMappingURL=buses.js.map