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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SeatLockError = exports.MAX_SEATS_PER_LOCK = exports.LOCK_TTL_MS = void 0;
exports.lockSeats = lockSeats;
exports.unlockSeats = unlockSeats;
exports.releaseExpiredLock = releaseExpiredLock;
exports.releaseExpiredLocks = releaseExpiredLocks;
const crypto_1 = require("crypto");
const mongoose_1 = __importStar(require("mongoose"));
const tripSeat_1 = require("../models/tripSeat");
exports.LOCK_TTL_MS = 5 * 60 * 1000;
exports.MAX_SEATS_PER_LOCK = 10;
class SeatLockError extends Error {
    constructor(code, message) {
        super(message);
        this.code = code;
        this.name = 'SeatLockError';
    }
}
exports.SeatLockError = SeatLockError;
function parseIds(tripId, seatIds, userId) {
    if (typeof tripId !== 'string' || !mongoose_1.Types.ObjectId.isValid(tripId)) {
        throw new SeatLockError('INVALID_INPUT', 'Invalid tripId.');
    }
    if (!Array.isArray(seatIds) || seatIds.length === 0) {
        throw new SeatLockError('INVALID_INPUT', 'seatIds must be a non-empty array.');
    }
    if (!seatIds.every((id) => typeof id === 'string' && mongoose_1.Types.ObjectId.isValid(id))) {
        throw new SeatLockError('INVALID_INPUT', 'seatIds contains an invalid id.');
    }
    const unique = [...new Set(seatIds)];
    if (unique.length > exports.MAX_SEATS_PER_LOCK) {
        throw new SeatLockError('INVALID_INPUT', `You can lock at most ${exports.MAX_SEATS_PER_LOCK} seats at once.`);
    }
    if (userId !== undefined && (typeof userId !== 'string' || !mongoose_1.Types.ObjectId.isValid(userId))) {
        throw new SeatLockError('INVALID_INPUT', 'Invalid user.');
    }
    return {
        tripObjectId: new mongoose_1.Types.ObjectId(tripId),
        seatObjectIds: unique.map((id) => new mongoose_1.Types.ObjectId(id)),
        userObjectId: userId ? new mongoose_1.Types.ObjectId(userId) : undefined,
    };
}
async function lockSeats(tripId, seatIds, userId, options = {}) {
    const { tripObjectId, seatObjectIds, userObjectId } = parseIds(tripId, seatIds, userId);
    const now = options.now ?? new Date();
    const lockedUntil = new Date(now.getTime() + (options.ttlMs ?? exports.LOCK_TTL_MS));
    const lockId = (0, crypto_1.randomUUID)();
    const session = await mongoose_1.default.startSession();
    try {
        await session.withTransaction(async () => {
            const result = await tripSeat_1.TripSeat.updateMany({
                _id: { $in: seatObjectIds },
                tripId: tripObjectId,
                $or: [
                    { status: 'available' },
                    { status: 'locked', lockedUntil: { $lte: now } },
                    { status: 'locked', lockedBy: userObjectId },
                ],
            }, { $set: { status: 'locked', lockedBy: userObjectId, lockedUntil, lockId } }, { session });
            if (result.modifiedCount !== seatObjectIds.length) {
                throw new SeatLockError('SEATS_UNAVAILABLE', 'One or more seats are no longer available.');
            }
        });
    }
    finally {
        await session.endSession();
    }
    return { lockId, lockedUntil, seatIds: seatObjectIds.map((id) => id.toString()) };
}
async function unlockSeats(tripId, seatIds, userId) {
    const { tripObjectId, seatObjectIds, userObjectId } = parseIds(tripId, seatIds, userId);
    const session = await mongoose_1.default.startSession();
    try {
        let released = [];
        await session.withTransaction(async () => {
            const filter = {
                _id: { $in: seatObjectIds },
                tripId: tripObjectId,
                status: 'locked',
                lockedBy: userObjectId,
            };
            const owned = await tripSeat_1.TripSeat.find(filter).select('_id').session(session).lean();
            if (owned.length === 0) {
                released = [];
                return;
            }
            await tripSeat_1.TripSeat.updateMany({ ...filter, _id: { $in: owned.map((s) => s._id) } }, { $set: { status: 'available', lockedBy: null, lockedUntil: null, lockId: null } }, { session });
            released = owned.map((s) => s._id.toString());
        });
        return released;
    }
    finally {
        await session.endSession();
    }
}
async function releaseExpiredLock(seatId, lockId, now = new Date()) {
    const result = await tripSeat_1.TripSeat.updateOne({ _id: seatId, status: 'locked', lockId, lockedUntil: { $lte: now } }, { $set: { status: 'available', lockedBy: null, lockedUntil: null, lockId: null } });
    return result.modifiedCount === 1;
}
async function releaseExpiredLocks(now = new Date()) {
    const expired = await tripSeat_1.TripSeat.find({ status: 'locked', lockedUntil: { $lte: now } })
        .select('_id tripId lockId')
        .lean();
    const byTrip = new Map();
    await Promise.all(expired.map(async (seat) => {
        if (!seat.lockId)
            return;
        if (await releaseExpiredLock(seat._id, seat.lockId, now)) {
            const key = seat.tripId.toString();
            byTrip.set(key, [...(byTrip.get(key) ?? []), seat._id.toString()]);
        }
    }));
    return [...byTrip.entries()].map(([tripId, seatIds]) => ({ tripId, seatIds }));
}
//# sourceMappingURL=seatLockService.js.map