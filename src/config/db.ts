import mongoose from 'mongoose'
import dotenv from 'dotenv'
dotenv.config()

const connectDB = async (): Promise<void> => {
  const uri = process.env.mongodb_uri
  if (!uri) {
    console.error('mongodb_uri is not defined in environment variables')
    process.exit(1)
  }
  await mongoose
    .connect(uri)
    .then(() => console.log('MongoDB connected...'))
    .catch((err: Error) => console.log(err.message))
}

export default connectDB

