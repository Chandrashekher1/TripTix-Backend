import mongoose, { ClientSession, Types } from 'mongoose'
import BusModel from '../models/buses'
import { Seat } from '../models/seat'
import { Trip, ITrip } from '../models/trip'
import { TripSeat } from '../models/tripSeat'

export type TripServiceErrorCode = 'BUS_NOT_FOUND' | 'NO_SEAT_LAYOUT' | 'TRIP_EXISTS' | 'TRIP_NOT_FOUND'

export class TripServiceError extends Error {
  constructor(public code: TripServiceErrorCode, message: string) {
    super(message)
    this.name = 'TripServiceError'
  }
}

const isDuplicateKeyError = (err: unknown): boolean =>
  typeof err === 'object' && err !== null && (err as { code?: number }).code === 11000


export async function generateTripInventory(
  tripId: Types.ObjectId | string,
  busId: Types.ObjectId | string,
  session?: ClientSession
): Promise<number> {
  const seats = await Seat.find({ busId }).select('_id').session(session ?? null).lean()
  if (seats.length === 0) {
    throw new TripServiceError('NO_SEAT_LAYOUT', 'The bus has no physical seat layout.')
  }

  const tripObjectId = new Types.ObjectId(tripId)
  const result = await TripSeat.bulkWrite(
    seats.map((seat) => ({
      updateOne: {

        filter: { tripId: tripObjectId, seatId: seat._id as Types.ObjectId },
        update: {
          $setOnInsert: {
            status: 'available' as const,
            lockedBy: null,
            lockedUntil: null,
            lockId: null,
          },
        },
        upsert: true,
      },
    })),
    { session, ordered: false }
  )
  return result.upsertedCount
}


export async function createTrip(busId: string, departureDate: Date): Promise<ITrip> {
  const session = await mongoose.startSession()
  try {
    let trip: ITrip | undefined
    await session.withTransaction(async () => {
      const bus = await BusModel.findById(busId).session(session)
      if (!bus) throw new TripServiceError('BUS_NOT_FOUND', 'Bus not found.')

      try {
        const [created] = await Trip.create([{ busId: bus._id, departureDate }], { session })
        trip = created
      } catch (err) {
        if (isDuplicateKeyError(err)) {
          throw new TripServiceError('TRIP_EXISTS', 'A trip for this bus and date already exists.')
        }
        throw err
      }

      await generateTripInventory(trip._id as Types.ObjectId, bus._id as Types.ObjectId, session)
    })
    return trip as ITrip
  } finally {
    await session.endSession()
  }
}
