import { Server } from 'socket.io'
import { releaseExpiredLocks } from './seatLockService'
import { tripRoom } from '../routes/socket'

export const EXPIRY_SWEEP_INTERVAL_MS = 15 * 1000


export function startLockExpiryWorker(io: Server, intervalMs = EXPIRY_SWEEP_INTERVAL_MS): () => void {
  let running = false

  const sweep = async () => {
    if (running) return
    running = true
    try {
      const released = await releaseExpiredLocks()
      for (const { tripId, seatIds } of released) {
        io.to(tripRoom(tripId)).emit('seatsUpdated', { tripId, seatIds, status: 'available' })
      }
    } catch (err) {
      console.error('Lock expiry sweep failed:', err)
    } finally {
      running = false
    }
  }

  void sweep()
  const timer = setInterval(sweep, intervalMs)
  return () => clearInterval(timer)
}
