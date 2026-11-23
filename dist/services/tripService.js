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
exports.TripServiceError = void 0;
exports.generateTripInventory = generateTripInventory;
exports.createTrip = createTrip;
const mongoose_1 = __importStar(require("mongoose"));
const buses_1 = __importDefault(require("../models/buses"));
const seat_1 = require("../models/seat");
const trip_1 = require("../models/trip");
const tripSeat_1 = require("../models/tripSeat");
class TripServiceError extends Error {
    constructor(code, message) {
        super(message);
        this.code = code;
        this.name = 'TripServiceError';
    }
}
exports.TripServiceError = TripServiceError;
const isDuplicateKeyError = (err) => typeof err === 'object' && err !== null && err.code === 11000;
async function generateTripInventory(tripId, busId, session) {
    const seats = await seat_1.Seat.find({ busId }).select('_id').session(session ?? null).lean();
    if (seats.length === 0) {
        throw new TripServiceError('NO_SEAT_LAYOUT', 'The bus has no physical seat layout.');
    }
    const tripObjectId = new mongoose_1.Types.ObjectId(tripId);
    const result = await tripSeat_1.TripSeat.bulkWrite(seats.map((seat) => ({
        updateOne: {
            filter: { tripId: tripObjectId, seatId: seat._id },
            update: {
                $setOnInsert: {
                    status: 'available',
                    lockedBy: null,
                    lockedUntil: null,
                    lockId: null,
                },
            },
            upsert: true,
        },
    })), { session, ordered: false });
    return result.upsertedCount;
}
async function createTrip(busId, departureDate) {
    const session = await mongoose_1.default.startSession();
    try {
        let trip;
        await session.withTransaction(async () => {
            const bus = await buses_1.default.findById(busId).session(session);
            if (!bus)
                throw new TripServiceError('BUS_NOT_FOUND', 'Bus not found.');
            try {
                const [created] = await trip_1.Trip.create([{ busId: bus._id, departureDate }], { session });
                trip = created;
            }
            catch (err) {
                if (isDuplicateKeyError(err)) {
                    throw new TripServiceError('TRIP_EXISTS', 'A trip for this bus and date already exists.');
                }
                throw err;
            }
            await generateTripInventory(trip._id, bus._id, session);
        });
        return trip;
    }
    finally {
        await session.endSession();
    }
}
//# sourceMappingURL=tripService.js.map