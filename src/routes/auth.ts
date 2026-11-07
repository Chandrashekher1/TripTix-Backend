import express, { Request, Response } from 'express'
import bcrypt from 'bcrypt'
import Joi from 'joi'
import { Users } from '../models/users'

const router = express.Router()

interface LoginBody {
  email: string
  password: string
}

function validate(user: LoginBody) {
  const schema = Joi.object({
    email: Joi.string().email().min(0).max(2000).required(),
    password: Joi.string().required(),
  })
  return schema.validate(user)
}

// POST / — login
router.post('/', async (req: Request, res: Response) => {
  try {
    const { error } = validate(req.body as LoginBody)
    if (error) return res.status(400).send(error.details[0].message)

    const user = await Users.findOne({ email: req.body.email })
    if (!user) return res.status(400).json({ message: 'User is not registered' })

    const validPassword = await bcrypt.compare(req.body.password as string, user.password)
    if (!validPassword) return res.status(400).json({ message: 'Invalid Password' })

    const token = user.generateAuthToken()
    return res.header('Authorization', token).send(user)
  } catch (err) {
    const error = err as Error
    console.error('Login error', error)
    return res.status(500).json({ success: false, message: 'Internal server error', error: error.message })
  }
})

export default router

