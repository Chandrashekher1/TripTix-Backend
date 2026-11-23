"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tripRoom = void 0;
const mongoose_1 = require("mongoose");
const socketAuth_1 = require("../middleware/socketAuth");
const seatLockService_1 = require("../services/seatLockService");
const tripRoom = (tripId) => `trip:${tripId}`;
exports.tripRoom = tripRoom;
const respond = (ack, response) => {
    if (typeof ack === 'function')
        ack(response);
};
const toFailure = (err) => {
    if (err instanceof seatLockService_1.SeatLockError) {
        return { success: false, code: err.code, message: err.message };
    }
    console.error('Seat socket error:', err);
    return { success: false, code: 'INTERNAL_ERROR', message: 'Something went wrong. Please try again.' };
};
const handleSocketConnection = (io) => {
    io.use(socketAuth_1.socketAuth);
    io.on('connection', (socket) => {
        const userId = socket.data.user._id;
        socket.on('joinTrip', (payload, ack) => {
            if (typeof payload?.tripId !== 'string' || !mongoose_1.Types.ObjectId.isValid(payload.tripId)) {
                return respond(ack, { success: false, code: 'INVALID_INPUT', message: 'Invalid tripId.' });
            }
            socket.join((0, exports.tripRoom)(payload.tripId));
            respond(ack, { success: true });
        });
        socket.on('lockSeats', async (payload, ack) => {
            try {
                const result = await (0, seatLockService_1.lockSeats)(payload?.tripId, payload?.seatIds, userId);
                io.to((0, exports.tripRoom)(payload.tripId)).emit('seatsUpdated', {
                    tripId: payload.tripId,
                    seatIds: result.seatIds,
                    status: 'locked',
                    userId,
                });
                respond(ack, {
                    success: true,
                    lockId: result.lockId,
                    lockedUntil: result.lockedUntil,
                    seatIds: result.seatIds,
                });
            }
            catch (err) {
                respond(ack, toFailure(err));
            }
        });
        socket.on('unlockSeats', async (payload, ack) => {
            try {
                const released = await (0, seatLockService_1.unlockSeats)(payload?.tripId, payload?.seatIds, userId);
                if (released.length > 0) {
                    io.to((0, exports.tripRoom)(payload.tripId)).emit('seatsUpdated', {
                        tripId: payload.tripId,
                        seatIds: released,
                        status: 'available',
                    });
                }
                respond(ack, { success: true, seatIds: released });
            }
            catch (err) {
                respond(ack, toFailure(err));
            }
        });
        socket.on('disconnect', () => {
            console.log('User disconnected: ' + socket.id);
        });
    });
};
exports.default = handleSocketConnection;
//# sourceMappingURL=socket.js.map