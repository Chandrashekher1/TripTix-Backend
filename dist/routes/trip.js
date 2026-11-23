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
const express_1 = __importDefault(require("express"));
const mongoose_1 = __importStar(require("mongoose"));
const auth_1 = __importDefault(require("../middleware/auth"));
const admin_1 = __importDefault(require("../middleware/admin"));
const trip_1 = require("../models/trip");
const tripSeat_1 = require("../models/tripSeat");
const tripService_1 = require("../services/tripService");
const router = express_1.default.Router();
router.get('/', async (req, res) => {
    try {
        const { busId } = req.query;
        if (!busId || !(0, mongoose_1.isValidObjectId)(busId)) {
            return res.status(400).json({ message: 'A valid busId is required.' });
        }
        const trips = await trip_1.Trip.find({ busId }).sort({ departureDate: 1 });
        return res.json({ success: true, data: trips });
    }
    catch (err) {
        const error = err;
        return res.status(500).json({ success: false, message: 'Internal Server error.', error: error.message });
    }
});
router.post('/', [auth_1.default, admin_1.default], async (req, res) => {
    try {
        const { busId, departureDate } = req.body;
        if (!busId || !departureDate) {
            return res.status(400).json({ message: 'Missing required fields: busId, departureDate' });
        }
        if (!(0, mongoose_1.isValidObjectId)(busId)) {
            return res.status(400).json({ message: 'Invalid bus ID.' });
        }
        const date = new Date(departureDate);
        if (Number.isNaN(date.getTime())) {
            return res.status(400).json({ message: 'Invalid departureDate.' });
        }
        const trip = await (0, tripService_1.createTrip)(busId, date);
        return res.status(201).json({ success: true, message: 'Trip created successfully', data: trip });
    }
    catch (err) {
        if (err instanceof tripService_1.TripServiceError) {
            const status = err.code === 'TRIP_EXISTS' ? 409 : err.code === 'BUS_NOT_FOUND' ? 404 : 400;
            return res.status(status).json({ success: false, message: err.message });
        }
        const error = err;
        return res.status(500).json({ success: false, message: 'Internal Server error.', error: error.message });
    }
});
router.patch('/:id', [auth_1.default, admin_1.default], async (req, res) => {
    try {
        if (!(0, mongoose_1.isValidObjectId)(req.params.id)) {
            return res.status(400).json({ message: 'Invalid trip ID.' });
        }
        const { departureDate } = req.body;
        if (!departureDate) {
            return res.status(400).json({ message: 'departureDate is required.' });
        }
        const date = new Date(departureDate);
        if (Number.isNaN(date.getTime())) {
            return res.status(400).json({ message: 'Invalid departureDate.' });
        }
        const trip = await trip_1.Trip.findByIdAndUpdate(req.params.id, { departureDate: date }, { new: true, runValidators: true });
        if (!trip)
            return res.status(404).json({ message: 'Trip not found.' });
        return res.json({ success: true, data: trip });
    }
    catch (err) {
        const error = err;
        if (error.code === 11000) {
            return res.status(409).json({ message: 'A trip already exists for this bus and departure date.' });
        }
        return res.status(500).json({ success: false, message: 'Internal Server error.', error: error.message });
    }
});
router.delete('/:id', [auth_1.default, admin_1.default], async (req, res) => {
    if (!(0, mongoose_1.isValidObjectId)(req.params.id)) {
        return res.status(400).json({ message: 'Invalid trip ID.' });
    }
    const session = await mongoose_1.default.startSession();
    try {
        let deleted = false;
        await session.withTransaction(async () => {
            const trip = await trip_1.Trip.findById(req.params.id).session(session);
            if (!trip)
                return;
            await tripSeat_1.TripSeat.deleteMany({ tripId: trip._id }).session(session);
            const result = await trip_1.Trip.deleteOne({ _id: trip._id }).session(session);
            deleted = result.deletedCount === 1;
        });
        if (!deleted)
            return res.status(404).json({ message: 'Trip not found.' });
        return res.json({ success: true, message: 'Trip deleted successfully.' });
    }
    catch (err) {
        const error = err;
        return res.status(500).json({ success: false, message: 'Internal Server error.', error: error.message });
    }
    finally {
        await session.endSession();
    }
});
exports.default = router;
//# sourceMappingURL=trip.js.map