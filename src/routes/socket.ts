import { Server } from 'socket.io'
import { Types } from 'mongoose'
import { socketAuth } from '../middleware/socketAuth'
import { lockSeats, unlockSeats, SeatLockError } from '../services/seatLockService'


interface TripPayload {
  tripId: string
}

interface SeatsPayload extends TripPayload {
  seatIds: string[]
}

type Ack = (response: Record<string, unknown>) => void

export const tripRoom = (tripId: string): string => `trip:${tripId}`

const respond = (ack: unknown, response: Record<string, unknown>): void => {
  if (typeof ack === 'function') (ack as Ack)(response)
}

const toFailure = (err: unknown): Record<string, unknown> => {
  if (err instanceof SeatLockError) {
    return { success: false, code: err.code, message: err.message }
  }
  console.error('Seat socket error:', err)
  return { success: false, code: 'INTERNAL_ERROR', message: 'Something went wrong. Please try again.' }
}

const handleSocketConnection = (io: Server): void => {
  io.use(socketAuth)

  io.on('connection', (socket) => {
    const userId = socket.data.user._id

    socket.on('joinTrip', (payload: TripPayload, ack?: Ack) => {
      if (typeof payload?.tripId !== 'string' || !Types.ObjectId.isValid(payload.tripId)) {
        return respond(ack, { success: false, code: 'INVALID_INPUT', message: 'Invalid tripId.' })
      }
      socket.join(tripRoom(payload.tripId))
      respond(ack, { success: true })
    })

    socket.on('lockSeats', async (payload: SeatsPayload, ack?: Ack) => {
      try {
        const result = await lockSeats(payload?.tripId, payload?.seatIds, userId)
        io.to(tripRoom(payload.tripId)).emit('seatsUpdated', {
          tripId: payload.tripId,
          seatIds: result.seatIds,
          status: 'locked',
          userId,
        })
        respond(ack, {
          success: true,
          lockId: result.lockId,
          lockedUntil: result.lockedUntil,
          seatIds: result.seatIds,
        })
      } catch (err) {
        respond(ack, toFailure(err))
      }
    })

    socket.on('unlockSeats', async (payload: SeatsPayload, ack?: Ack) => {
      try {
        const released = await unlockSeats(payload?.tripId, payload?.seatIds, userId)
        if (released.length > 0) {
          io.to(tripRoom(payload.tripId)).emit('seatsUpdated', {
            tripId: payload.tripId,
            seatIds: released,
            status: 'available',
          })
        }
        respond(ack, { success: true, seatIds: released })
      } catch (err) {
        respond(ack, toFailure(err))
      }
    })

    socket.on('disconnect', () => {
      console.log('User disconnected: ' + socket.id)
    })
  })
}

export default handleSocketConnection
