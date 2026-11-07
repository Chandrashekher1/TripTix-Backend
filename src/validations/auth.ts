import Joi from 'joi'

export interface LoginInput {
  email: string
  password: string
}

export function validateAuth(data: LoginInput) {
  const schema = Joi.object({
    email: Joi.string().email().min(0).max(2000).required(),
    password: Joi.string().required(),
  })
  return schema.validate(data)
}

export const validateLogin = validateAuth

