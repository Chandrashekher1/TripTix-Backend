"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const seat_1 = require("../models/seat");
const handleSocketConnection = (io) => {
    io.on('connection', (socket) => {
        socket.on('lockSeats', async ({ busId, seatIds, userId }) => {
            if (!mongoose_1.Types.ObjectId.isValid(userId)) {
                console.error('Invalid userId:', userId);
                return;
            }
            await seat_1.Seat.updateMany({ _id: { $in: seatIds }, busId }, {
                $set: {
                    status: 'locked',
                    userId: new mongoose_1.Types.ObjectId(userId),
                    lockedUntil: new Date(Date.now() + 1 * 60 * 1000),
                },
            });
            io.emit('seatsUpdated', { seatIds, status: 'locked', userId });
            setTimeout(async () => {
                await seat_1.Seat.updateMany({
                    _id: { $in: seatIds },
                    status: 'locked',
                    userId: new mongoose_1.Types.ObjectId(userId),
                    lockedUntil: { $lte: new Date() },
                }, {
                    $set: {
                        status: 'available',
                        userId: null,
                        lockedUntil: null,
                    },
                });
                io.emit('seatsUpdated', { seatIds, status: 'available' });
            }, 5 * 60 * 1000);
        });
        socket.on('unlockSeats', async ({ seatIds }) => {
            await seat_1.Seat.updateMany({ _id: { $in: seatIds } }, { $set: { status: 'available', userId: null, lockedUntil: null } });
            io.emit('seatsUpdated', { seatIds, status: 'available' });
        });
        socket.on('disconnect', () => {
            console.log('User disconnected: ' + socket.id);
        });
    });
};
exports.default = handleSocketConnection;
//# sourceMappingURL=socket.js.map