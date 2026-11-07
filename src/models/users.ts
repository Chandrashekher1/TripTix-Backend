import mongoose, { Document, Schema, Model } from 'mongoose'
import jwt from 'jsonwebtoken'

export interface IUser extends Document {
  name: string
  email: string
  password: string
  phone: number
  image?: string
  generateAuthToken(): string
}

const UserSchema = new Schema<IUser>({
  name: {
    type: String,
    required: true,
    lowercase: true,
    minlength: 2,
    maxlength: 200,
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
    minlength: 5,
    maxlength: 1024,
  },
  phone: {
    type: Number,
    required: true,
  },
  image: {
    type: String,
  },
})

UserSchema.methods.generateAuthToken = function (): string {
  const token = jwt.sign({ _id: this._id }, process.env.jwtPrivateKey as string)
  return token
}

export const Users: Model<IUser> = mongoose.model<IUser>('users', UserSchema)

export {
  validateSignup,
  validateUser,
  validateUserUpdate,
  UserSignupInput,
  UserValidationInput,
} from '../validations/user'
