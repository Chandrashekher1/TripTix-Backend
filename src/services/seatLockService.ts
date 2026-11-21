import { randomUUID } from 'crypto'
import mongoose, { Types } from 'mongoose'
import { TripSeat } from '../models/tripSeat'

export const LOCK_TTL_MS = 5 * 60 * 1000
export const MAX_SEATS_PER_LOCK = 10

export type SeatLockErrorCode = 'INVALID_INPUT' | 'SEATS_UNAVAILABLE'

export class SeatLockError extends Error {
  constructor(public code: SeatLockErrorCode, message: string) {
    super(message)
    this.name = 'SeatLockError'
  }
}

export interface LockResult {
  lockId: string
  lockedUntil: Date
  seatIds: string[]
}

export interface ReleasedLocks {
  tripId: string
  seatIds: string[]
}

function parseIds(tripId: unknown, seatIds: unknown, userId?: unknown) {
  if (typeof tripId !== 'string' || !Types.ObjectId.isValid(tripId)) {
    throw new SeatLockError('INVALID_INPUT', 'Invalid tripId.')
  }
  if (!Array.isArray(seatIds) || seatIds.length === 0) {
    throw new SeatLockError('INVALID_INPUT', 'seatIds must be a non-empty array.')
  }
  if (!seatIds.every((id) => typeof id === 'string' && Types.ObjectId.isValid(id))) {
    throw new SeatLockError('INVALID_INPUT', 'seatIds contains an invalid id.')
  }
  const unique = [...new Set(seatIds as string[])]
  if (unique.length > MAX_SEATS_PER_LOCK) {
    throw new SeatLockError('INVALID_INPUT', `You can lock at most ${MAX_SEATS_PER_LOCK} seats at once.`)
  }
  if (userId !== undefined && (typeof userId !== 'string' || !Types.ObjectId.isValid(userId))) {
    throw new SeatLockError('INVALID_INPUT', 'Invalid user.')
  }
  return {
    tripObjectId: new Types.ObjectId(tripId),
    seatObjectIds: unique.map((id) => new Types.ObjectId(id)),
    userObjectId: userId ? new Types.ObjectId(userId as string) : undefined,
  }
}


export async function lockSeats(
  tripId: string,
  seatIds: string[],
  userId: string,
  options: { now?: Date; ttlMs?: number } = {}
): Promise<LockResult> {
  const { tripObjectId, seatObjectIds, userObjectId } = parseIds(tripId, seatIds, userId)
  const now = options.now ?? new Date()
  const lockedUntil = new Date(now.getTime() + (options.ttlMs ?? LOCK_TTL_MS))
  const lockId = randomUUID()

  const session = await mongoose.startSession()
  try {
    await session.withTransaction(async () => {
      const result = await TripSeat.updateMany(
        {
          _id: { $in: seatObjectIds },
          tripId: tripObjectId,
          $or: [
            { status: 'available' },
            { status: 'locked', lockedUntil: { $lte: now } },
            { status: 'locked', lockedBy: userObjectId },
          ],
        },
        { $set: { status: 'locked', lockedBy: userObjectId, lockedUntil, lockId } },
        { session }
      )
      if (result.modifiedCount !== seatObjectIds.length) {

        throw new SeatLockError('SEATS_UNAVAILABLE', 'One or more seats are no longer available.')
      }
    })
  } finally {
    await session.endSession()
  }

  return { lockId, lockedUntil, seatIds: seatObjectIds.map((id) => id.toString()) }
}


export async function unlockSeats(tripId: string, seatIds: string[], userId: string): Promise<string[]> {
  const { tripObjectId, seatObjectIds, userObjectId } = parseIds(tripId, seatIds, userId)

  const session = await mongoose.startSession()
  try {
    let released: string[] = []
    await session.withTransaction(async () => {
      const filter = {
        _id: { $in: seatObjectIds },
        tripId: tripObjectId,
        status: 'locked' as const,
        lockedBy: userObjectId,
      }
      const owned = await TripSeat.find(filter).select('_id').session(session).lean()
      if (owned.length === 0) {
        released = []
        return
      }
      await TripSeat.updateMany(
        { ...filter, _id: { $in: owned.map((s) => s._id) } },
        { $set: { status: 'available', lockedBy: null, lockedUntil: null, lockId: null } },
        { session }
      )
      released = owned.map((s) => s._id.toString())
    })
    return released
  } finally {
    await session.endSession()
  }
}


export async function releaseExpiredLock(
  seatId: Types.ObjectId | string,
  lockId: string,
  now: Date = new Date()
): Promise<boolean> {
  const result = await TripSeat.updateOne(
    { _id: seatId, status: 'locked', lockId, lockedUntil: { $lte: now } },
    { $set: { status: 'available', lockedBy: null, lockedUntil: null, lockId: null } }
  )
  return result.modifiedCount === 1
}


export async function releaseExpiredLocks(now: Date = new Date()): Promise<ReleasedLocks[]> {
  const expired = await TripSeat.find({ status: 'locked', lockedUntil: { $lte: now } })
    .select('_id tripId lockId')
    .lean()

  const byTrip = new Map<string, string[]>()
  await Promise.all(
    expired.map(async (seat) => {
      if (!seat.lockId) return
      if (await releaseExpiredLock(seat._id, seat.lockId, now)) {
        const key = seat.tripId.toString()
        byTrip.set(key, [...(byTrip.get(key) ?? []), seat._id.toString()])
      }
    })
  )
  return [...byTrip.entries()].map(([tripId, seatIds]) => ({ tripId, seatIds }))
}
