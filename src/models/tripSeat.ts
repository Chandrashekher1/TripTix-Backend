import mongoose, { Document, Schema, Model, Types } from 'mongoose'

export type TripSeatStatus = 'available' | 'locked' | 'booked'

export interface ITripSeat extends Document {
  tripId: Types.ObjectId
  seatId: Types.ObjectId
  status: TripSeatStatus
  lockedBy: Types.ObjectId | null
  lockedUntil: Date | null

  lockId: string | null
  createdAt: Date
  updatedAt: Date
}

const TripSeatSchema = new Schema<ITripSeat>(
  {
    tripId: { type: Schema.Types.ObjectId, required: true, ref: 'Trip' },
    seatId: { type: Schema.Types.ObjectId, required: true, ref: 'Seat' },
    status: { type: String, enum: ['available', 'locked', 'booked'], default: 'available', required: true },
    lockedBy: { type: Schema.Types.ObjectId, ref: 'users', default: null },
    lockedUntil: { type: Date, default: null },
    lockId: { type: String, default: null },
  },
  { timestamps: true }
)


TripSeatSchema.index({ tripId: 1, seatId: 1 }, { unique: true })

TripSeatSchema.index({ status: 1, lockedUntil: 1 })

export const TripSeat: Model<ITripSeat> = mongoose.model<ITripSeat>('TripSeat', TripSeatSchema)
