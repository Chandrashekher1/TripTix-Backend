import mongoose, { Document, Schema, Model, Types } from 'mongoose'

export interface ISeat extends Document {
  seatNumber: string
  status: string
  lockedUntil: Date | null
  seatPreference: string
  busId: Types.ObjectId
  userId: Types.ObjectId | null
  date: Date
  createdAt: Date
  updatedAt: Date
}

const SeatSchema = new Schema<ISeat>({
  seatNumber: { type: String, required: true },
  status: { type: String, required: true, lowercase: true },
  lockedUntil: { type: Date, default: null },
  seatPreference: { type: String, required: true, lowercase: true },
  busId: { type: Schema.Types.ObjectId, required: true, ref: 'Buses' },
  userId: { type: Schema.Types.ObjectId, ref: 'users', default: null },
  date: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
})

export const Seat: Model<ISeat> = mongoose.model<ISeat>('Seat', SeatSchema)

