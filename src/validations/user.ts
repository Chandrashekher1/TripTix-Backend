import Joi from 'joi'

export interface UserSignupInput {
  name: string
  email: string
  password: string
  phone: number
}

export interface UserUpdateInput {
  name?: string
  email?: string
  phone?: number
}

export function validateSignup(data: UserSignupInput) {
  const schema = Joi.object({
    name: Joi.string().min(3).max(200).required(),
    email: Joi.string().email().min(0).max(2000).required(),
    password: Joi.string().min(5).max(1024).required(),
    phone: Joi.number().required(),
  })
  return schema.validate(data)
}

export function validateUserUpdate(data: UserUpdateInput) {
  const schema = Joi.object({
    name: Joi.string().min(3).max(200),
    email: Joi.string().email().min(0).max(2000),
    phone: Joi.number(),
  })
  return schema.validate(data)
}

// Aliases for backward compatibility
export const validateUser = validateSignup
export type UserValidationInput = UserSignupInput

