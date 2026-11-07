import express, { Request, Response } from 'express'
import bcrypt from 'bcrypt'
import { Users } from '../models/users'
import { validateAuth, LoginInput } from '../validations/auth'

const router = express.Router()

// POST / — login
router.post('/', async (req: Request, res: Response) => {
  try {
    const { error } = validateAuth(req.body as LoginInput)
    if (error) return res.status(400).send(error.details[0].message)

    const user = await Users.findOne({ email: req.body.email })
    if (!user) return res.status(400).json({ message: 'User is not registered' })

    const validPassword = await bcrypt.compare(req.body.password as string, user.password)
    if (!validPassword) return res.status(400).json({ message: 'Invalid Password' })

    const token = user.generateAuthToken()
    return res.header('Authorization', token).json({
      _id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone
    })
  } catch (err) {
    const error = err as Error
    console.error('Login error', error)
    return res.status(500).json({ success: false, message: 'Internal server error', error: error.message })
  }
})

export default router
