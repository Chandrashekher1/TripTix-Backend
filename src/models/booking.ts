import mongoose, { Document, Schema, Model, Types } from 'mongoose'

export interface IPassenger {
  name: string
  age: number
  gender: string
  seatId?: Types.ObjectId
}

export interface ICancelledSeat {
  seatId: Types.ObjectId
  seatNumber: string
  passengerName: string
  refundAmountPaise: number
  razorpayRefundId: string
  cancelledAt: Date
}

export interface IBooking extends Document {
  userId: Types.ObjectId
  busId: Types.ObjectId
  tripId: Types.ObjectId
  seatIds: Types.ObjectId[]
  passengerDetails: IPassenger[]
  cancelledSeats: ICancelledSeat[]
  status: 'confirmed' | 'partially_cancelled' | 'cancelled'
  razorpayOrderId?: string
  razorpayPaymentId?: string
  createdAt: Date
}

const BookingSchema = new Schema<IBooking>({
  userId: { type: Schema.Types.ObjectId, required: true, ref: 'users' },
  busId: { type: Schema.Types.ObjectId, required: true, ref: 'Buses' },
  tripId: { type: Schema.Types.ObjectId, required: true, ref: 'Trip' },
  seatIds: [{ type: Schema.Types.ObjectId, required: true, ref: 'TripSeat' }],
  passengerDetails: [
    {
      name: { type: String, required: true, lowercase: true, trim: true },
      age: { type: Number, required: true, min: 1, max: 120 },
      gender: { type: String, required: true, lowercase: true, trim: true },
      seatId: { type: Schema.Types.ObjectId, ref: 'TripSeat' },
    },
  ],
  cancelledSeats: [
    {
      seatId: { type: Schema.Types.ObjectId, required: true, ref: 'TripSeat' },
      seatNumber: { type: String, required: true },
      passengerName: { type: String, required: true },
      refundAmountPaise: { type: Number, required: true },
      razorpayRefundId: { type: String, required: true },
      cancelledAt: { type: Date, default: Date.now },
    },
  ],
  status: {
    type: String,
    required: true,
    enum: ['confirmed', 'partially_cancelled', 'cancelled'],
    default: 'confirmed',
  },
  razorpayOrderId: { type: String, unique: true, sparse: true },
  razorpayPaymentId: { type: String, unique: true, sparse: true },
  createdAt: { type: Date, default: Date.now },
})

export const Booking: Model<IBooking> = mongoose.model<IBooking>('Booking', BookingSchema)
