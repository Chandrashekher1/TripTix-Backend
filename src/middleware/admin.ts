import { Response, NextFunction } from 'express'
import { AuthRequest } from '../types'

function admin(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!req.user?.isAdmin) {
    res.status(403).send('Access denied.')
    return
  }
  next()
}

export default admin

