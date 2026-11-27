import mongoose, { Document, Schema, Model, Types } from 'mongoose'
import { IPassenger } from './booking'

export interface IRefundLog {
  razorpayRefundId: string
  amountPaise: number
  seatId: Types.ObjectId
  createdAt: Date
}

export interface IPayment extends Document {
  userId: Types.ObjectId
  tripId: Types.ObjectId
  seatIds: Types.ObjectId[]
  bookingId?: Types.ObjectId
  amountPaise: number
  currency: 'INR'
  razorpayOrderId: string
  razorpayPaymentId?: string
  status: 'pending' | 'completed' | 'failed' | 'partially_refunded' | 'refunded'
  refundedAmountPaise: number
  refunds: IRefundLog[]
  passengerDetails?: IPassenger[]
  createdAt: Date
  updatedAt: Date
}

const PaymentSchema = new Schema<IPayment>(
  {
    userId: { type: Schema.Types.ObjectId, required: true, ref: 'users' },
    tripId: { type: Schema.Types.ObjectId, required: true, ref: 'Trip' },
    seatIds: [{ type: Schema.Types.ObjectId, required: true, ref: 'TripSeat' }],
    bookingId: { type: Schema.Types.ObjectId, ref: 'Booking' },
    amountPaise: { type: Number, required: true, min: 1 },
    currency: { type: String, required: true, enum: ['INR'], default: 'INR' },
    razorpayOrderId: { type: String, required: true, unique: true },
    razorpayPaymentId: { type: String, unique: true, sparse: true },
    status: {
      type: String,
      required: true,
      enum: ['pending', 'completed', 'failed', 'partially_refunded', 'refunded'],
      default: 'pending',
    },
    refundedAmountPaise: { type: Number, default: 0 },
    refunds: [
      {
        razorpayRefundId: { type: String, required: true },
        amountPaise: { type: Number, required: true },
        seatId: { type: Schema.Types.ObjectId, required: true, ref: 'TripSeat' },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    passengerDetails: [
      {
        name: { type: String, trim: true },
        age: { type: Number },
        gender: { type: String, trim: true },
      },
    ],
  },
  { timestamps: true }
)

export const PaymentModel: Model<IPayment> = mongoose.model<IPayment>('payment', PaymentSchema)
