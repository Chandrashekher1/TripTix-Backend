import { Server } from 'socket.io'
import { Types } from 'mongoose'
import { Seat } from '../models/seat'

interface LockSeatsPayload {
  busId: string
  seatIds: string[]
  userId: string
}

interface UnlockSeatsPayload {
  seatIds: string[]
}

const handleSocketConnection = (io: Server): void => {
  io.on('connection', (socket) => {
    socket.on('lockSeats', async ({ busId, seatIds, userId }: LockSeatsPayload) => {
      if (!Types.ObjectId.isValid(userId)) {
        console.error('Invalid userId:', userId)
        return
      }

      await Seat.updateMany(
        { _id: { $in: seatIds }, busId },
        {
          $set: {
            status: 'locked',
            userId: new Types.ObjectId(userId),
            lockedUntil: new Date(Date.now() + 1 * 60 * 1000),
          },
        }
      )

      io.emit('seatsUpdated', { seatIds, status: 'locked', userId })

      setTimeout(async () => {
        await Seat.updateMany(
          {
            _id: { $in: seatIds },
            status: 'locked',
            userId: new Types.ObjectId(userId),
            lockedUntil: { $lte: new Date() },
          },
          {
            $set: {
              status: 'available',
              userId: null,
              lockedUntil: null,
            },
          }
        )
        io.emit('seatsUpdated', { seatIds, status: 'available' })
      }, 5 * 60 * 1000)
    })

    socket.on('unlockSeats', async ({ seatIds }: UnlockSeatsPayload) => {
      await Seat.updateMany(
        { _id: { $in: seatIds } },
        { $set: { status: 'available', userId: null, lockedUntil: null } }
      )
      io.emit('seatsUpdated', { seatIds, status: 'available' })
    })

    socket.on('disconnect', () => {
      console.log('User disconnected: ' + socket.id)
    })
  })
}

export default handleSocketConnection

