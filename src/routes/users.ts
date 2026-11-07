import express, { Response } from 'express'
import bcrypt from 'bcrypt'
import auth from '../middleware/auth'
import { Users } from '../models/users'
import { validateSignup, validateUserUpdate } from '../validations/user'
import { AuthRequest } from '../types'

const router = express.Router()

// GET /me — current user profile
router.get('/me', auth, async (req: AuthRequest, res: Response) => {
  try {
    const user = await Users.findById(req.user!._id).select('-password')
    res.status(200).json({ success: true, data: user })
  } catch (error) {
    const err = error as Error
    res.status(500).json({ success: false, message: err.message })
  }
})

// GET /user/:id — get user by id
router.get('/user/:id', auth, async (req: AuthRequest, res: Response) => {
  try {
    const user = await Users.findById(req.params.id).select('-password')
    res.status(200).json({ success: true, data: user })
  } catch (error) {
    const err = error as Error
    res.status(500).json({ success: false, message: err.message })
  }
})

// POST /signup — register new user
router.post('/signup', async (req: AuthRequest, res: Response) => {
  try {
    const { error } = validateSignup(req.body)
    if (error) return res.status(400).json({ message: error.details[0].message })

    const existingUser = await Users.findOne({ email: req.body.email })
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User already exists' })
    }

    let user = new Users({
      name: req.body.name,
      email: req.body.email,
      password: req.body.password,
      phone: req.body.phone,
    })

    const salt = await bcrypt.genSalt(10)
    user.password = await bcrypt.hash(user.password, salt)
    user = await user.save()
    const token = user.generateAuthToken()

    return res.status(201).header('Authorization', token).json({
      success: true,
      token,
      message: 'User registered successfully.',
    })
  } catch (error) {
    const err = error as Error
    return res.status(500).json({ success: false, message: 'Registration failed', error: err.message })
  }
})

// PUT /:id — full update user
router.put('/:id', auth, async (req: AuthRequest, res: Response) => {
  try {
    const { error } = validateUserUpdate(req.body)
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message })
    }

    const user = await Users.findByIdAndUpdate(
      req.params.id,
      { name: req.body.name, email: req.body.email, phone: req.body.phone },
      { new: true }
    ).select('-password')

    if (!user) return res.status(404).json({ success: false, message: 'User not found' })

    return res.status(200).json({ success: true, message: 'User updated', data: user })
  } catch (error) {
    const err = error as Error
    return res.status(500).json({ success: false, message: err.message })
  }
})

// PATCH /:id — partial update user
router.patch('/:id', auth, async (req: AuthRequest, res: Response) => {
  try {
    const updateData: Record<string, unknown> = {
      name: req.body.name,
      email: req.body.email,
      phone: req.body.phone,
    }

    if (req.body.password) {
      const salt = await bcrypt.genSalt(10)
      updateData.password = await bcrypt.hash(req.body.password as string, salt)
    }

    const user = await Users.findByIdAndUpdate(req.params.id, updateData, { new: true }).select('-password')

    if (!user) return res.status(404).json({ success: false, message: 'User not found' })

    return res.status(200).json({ success: true, message: 'User updated', data: user })
  } catch (error) {
    const err = error as Error
    return res.status(500).json({ success: false, message: err.message })
  }
})

export default router
