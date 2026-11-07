import mongoose, { Document, Schema, Model, Types } from 'mongoose'

interface IPassenger {
  name: string
  age: string
  gender: string
}

export interface IBooking extends Document {
  userId: Types.ObjectId
  busId: Types.ObjectId
  seatIds: Types.ObjectId[]
  passengerDetails: IPassenger[]
  status: string
  createdAt: Date
}

const BookingSchema = new Schema<IBooking>({
  userId: { type: Schema.Types.ObjectId, required: true, ref: 'users' },
  busId: { type: Schema.Types.ObjectId, required: true, ref: 'Buses' },
  seatIds: [{ type: Schema.Types.ObjectId, ref: 'Seat', required: true }],
  passengerDetails: [
    {
      name: { type: String, required: true, lowercase: true },
      age: { type: String, required: true, lowercase: true },
      gender: { type: String, required: true, lowercase: true },
    },
  ],
  status: { type: String, default: 'confirmed' },
  createdAt: { type: Date, default: Date.now },
})

export const Booking: Model<IBooking> = mongoose.model<IBooking>('Booking', BookingSchema)

