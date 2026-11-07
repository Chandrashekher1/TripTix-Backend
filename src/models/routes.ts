import mongoose, { Document, Schema, Model } from 'mongoose'

export interface IRoute extends Document {
  origin: string
  destination: string
  distance: number
}

const RoutesSchema = new Schema<IRoute>({
  origin: { type: String, required: true, lowercase: true },
  destination: { type: String, required: true, lowercase: true },
  distance: { type: Number, required: true },
})

export const Routes: Model<IRoute> = mongoose.model<IRoute>('Routes', RoutesSchema)

