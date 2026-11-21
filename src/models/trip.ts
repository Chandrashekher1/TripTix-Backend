import mongoose, { Document, Schema, Model, Types } from 'mongoose'

export interface ITrip extends Document {
  busId: Types.ObjectId
  departureDate: Date
  createdAt: Date
}

const TripSchema = new Schema<ITrip>({
  busId: { type: Schema.Types.ObjectId, required: true, ref: 'Buses' },
  departureDate: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
})


TripSchema.index({ busId: 1, departureDate: 1 }, { unique: true })

export const Trip: Model<ITrip> = mongoose.model<ITrip>('Trip', TripSchema)
