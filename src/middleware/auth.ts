import { Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { AuthRequest, JwtPayload } from '../types'

function auth(req: AuthRequest, res: Response, next: NextFunction): void {
  const token = req.header('Authorization')
  if (!token) {
    res.status(401).send('Access denied. No token provided')
    return
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.jwtPrivateKey as string
    ) as JwtPayload
    req.user = decoded
    next()
  } catch {
    res.status(400).send('Invalid token.')
  }
}

export default auth

