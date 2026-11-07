import mongoose, { Document, Schema, Model, Types } from 'mongoose'

export interface IBus extends Document {
  operator: string
  dep_time: string
  arrivalTime: string
  isAc: boolean
  isSeater: boolean
  isSleeper: boolean
  isWifi: boolean
  price: number
  totalSeat: number
  busType: string
  busNumber: string
  routesId: Types.ObjectId
  images: string[]
  date: Date
  rating: number
  createdAt: Date
  updatedAt: Date
}

const BusSchema = new Schema<IBus>({
  operator: { type: String, required: true },
  dep_time: { type: String, required: true },
  arrivalTime: { type: String, required: true },
  isAc: { type: Boolean, required: true },
  isSeater: { type: Boolean, required: true },
  isSleeper: { type: Boolean, required: true },
  isWifi: { type: Boolean, required: true },
  price: { type: Number, required: true },
  totalSeat: { type: Number, required: true },
  busType: { type: String, required: true },
  busNumber: { type: String, required: true },
  routesId: { type: Schema.Types.ObjectId, ref: 'Routes', required: true },
  images: [String],
  date: { type: Date, default: Date.now },
  rating: { type: Number, default: 1, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
})

const BusModel: Model<IBus> = mongoose.model<IBus>('Buses', BusSchema)

export default BusModel

