import express, { Response } from 'express'
import auth from '../middleware/auth'
import razorpay from '../config/razorpay'
import { AuthRequest } from '../types'

const router = express.Router()

// POST /create-order — create Razorpay order
router.post('/create-order', [auth], async (req: AuthRequest, res: Response) => {
  const { amount } = req.body as { amount: number }
  console.log(amount)

  const options = {
    amount: amount * 100,
    currency: 'INR',
  }

  try {
    const order = await razorpay.orders.create(options)
    return res.json(order)
  } catch (error) {
    return res.status(500).send(error)
  }
})

export default router

