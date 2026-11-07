import mongoose, { Document, Schema, Model, Types } from 'mongoose'

export interface IPayment extends Document {
  bookinId: Types.ObjectId
  userId: Types.ObjectId
  amount: number
  status: 'pending' | 'completed' | 'failed'
  trainsactionId: string
  createdAt: Date
}

const PaymentSchema = new Schema<IPayment>({
  bookinId: { type: Schema.Types.ObjectId, required: true, ref: 'Booking' },
  userId: { type: Schema.Types.ObjectId, required: true, ref: 'users' },
  amount: { type: Number, required: true },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'completed', 'failed'],
  },
  trainsactionId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
})

export const Payment: Model<IPayment> = mongoose.model<IPayment>('payment', PaymentSchema)

