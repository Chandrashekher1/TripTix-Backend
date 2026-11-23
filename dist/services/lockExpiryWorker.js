"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EXPIRY_SWEEP_INTERVAL_MS = void 0;
exports.startLockExpiryWorker = startLockExpiryWorker;
const seatLockService_1 = require("./seatLockService");
const socket_1 = require("../routes/socket");
exports.EXPIRY_SWEEP_INTERVAL_MS = 15 * 1000;
function startLockExpiryWorker(io, intervalMs = exports.EXPIRY_SWEEP_INTERVAL_MS) {
    let running = false;
    const sweep = async () => {
        if (running)
            return;
        running = true;
        try {
            const released = await (0, seatLockService_1.releaseExpiredLocks)();
            for (const { tripId, seatIds } of released) {
                io.to((0, socket_1.tripRoom)(tripId)).emit('seatsUpdated', { tripId, seatIds, status: 'available' });
            }
        }
        catch (err) {
            console.error('Lock expiry sweep failed:', err);
        }
        finally {
            running = false;
        }
    };
    void sweep();
    const timer = setInterval(sweep, intervalMs);
    return () => clearInterval(timer);
}
//# sourceMappingURL=lockExpiryWorker.js.map