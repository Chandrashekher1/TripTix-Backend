import express, { Response } from 'express'
import auth from '../middleware/auth'
import admin from '../middleware/admin'
import { Routes } from '../models/routes'
import { AuthRequest } from '../types'

const router = express.Router()

// GET / — find route by origin and destination
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { origin, destination } = req.query as { origin?: string; destination?: string }
    if (!origin || !destination) {
      return res.status(400).json({ message: 'Missing origin or destination.' })
    }

    const route = await Routes.findOne({ origin, destination })
    if (!route) return res.status(404).json({ message: 'No routes found.' })

    return res.json({ success: true, data: route })
  } catch (err) {
    const error = err as Error
    return res.status(500).json({ success: false, message: 'Internal Server error.', error: error.message })
  }
})

// POST / — create new route (admin)
router.post('/', [auth, admin], async (req: AuthRequest, res: Response) => {
  try {
    const { origin, destination, distance } = req.body as {
      origin: string
      destination: string
      distance: number
    }

    if (!origin || !destination || !distance) {
      return res.status(400).json({ message: 'Missing or invalid fields: origin, destination, distance' })
    }

    const existingRoute = await Routes.findOne({ origin, destination })
    if (existingRoute) return res.status(409).json({ message: 'Route already exists' })

    let route = new Routes({ origin, destination, distance })
    route = await route.save()

    return res.status(200).json({ success: true, message: 'Routes created successfully.' })
  } catch (err) {
    const error = err as Error
    return res.status(500).json({ success: false, message: 'Internal Server error.', error: error.message })
  }
})

// PATCH /:id — update route (admin)
router.patch('/:id', [auth, admin], async (req: AuthRequest, res: Response) => {
  try {
    const { origin, destination, distance } = req.body as {
      origin: string
      destination: string
      distance: number
    }

    const route = await Routes.findByIdAndUpdate(
      req.params.id,
      { origin, destination, distance },
      { new: true }
    )

    if (!route) return res.status(404).json({ message: 'Route not found.' })

    return res.json({ success: true, data: route })
  } catch (err) {
    const error = err as Error
    return res.status(500).json({ success: false, message: 'Internal server error.', error: error.message })
  }
})

// DELETE /:id — delete route (admin)
router.delete('/:id', [auth, admin], async (req: AuthRequest, res: Response) => {
  try {
    const route = await Routes.findByIdAndDelete(req.params.id)
    if (!route) return res.status(404).json({ message: 'Route is not available with this ID.' })

    return res.json({ success: true, message: 'Route deleted successfully.' })
  } catch (err) {
    const error = err as Error
    return res.status(500).json({ message: 'Internal server error', error: error.message })
  }
})

export default router

