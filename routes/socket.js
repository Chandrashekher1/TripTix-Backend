const { Seat } = require('../models/seat')
const { Types } = require('mongoose')

const handleSocketConnection = (io) => {
  io.on('connection', (socket) => {
    socket.on('lockSeats', async ({ busId, seatIds, userId }) => {

      if (!Types.ObjectId.isValid(userId)) {
        console.error('Invalid userId:', userId)
        return
      }
      await Seat.updateMany(
        { _id: { $in: seatIds },
            busId 
        },
        {
          $set: {
            status: 'locked',
            userId: new Types.ObjectId(userId),
            lockedUntil: new Date(Date.now() + 1 * 60 * 1000)
          }
        }
      )
      io.emit('seatsUpdated', { seatIds, status: 'locked', userId })

      setTimeout(async () => {
        await Seat.updateMany(
          { _id: { $in: seatIds },
            status: 'locked',
            userId: new Types.ObjectId(userId),
            lockedUntil: { $lte: new Date() }  
        },
          {
            $set: {
              status: 'available',
              userId: null,
              lockedUntil: null
            }
          }

        )
        io.emit('seatsUpdated', { seatIds, status: 'available' });
      },1*60*1000)

    });

    socket.on('unlockSeats', async ({ seatIds }) => {
      await Seat.updateMany(
        { _id: { $in: seatIds } },
        {
          $set: {
            status: 'available',
            userId: null,
            lockedUntil: null
          }
        }
      )

      io.emit('seatsUpdated', { seatIds, status: 'available' })
    });

    socket.on('disconnect', () => {
      console.log('User disconnected: ' + socket.id)
    })
  })
}

module.exports = handleSocketConnection
