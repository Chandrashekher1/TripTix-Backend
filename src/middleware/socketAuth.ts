import jwt from 'jsonwebtoken'
import { Socket } from 'socket.io'
import { JwtPayload } from '../types'

export interface SocketUser {
  _id: string
  isAdmin?: boolean
}

declare module 'socket.io' {
  interface SocketData {
    user: SocketUser
  }
}


export function socketAuth(socket: Socket, next: (err?: Error) => void): void {
  const token = socket.handshake.auth?.token
  if (typeof token !== 'string' || token.length === 0) {
    return next(new Error('Authentication required'))
  }

  try {
    const decoded = jwt.verify(token, process.env.jwtPrivateKey as string) as JwtPayload
    if (!decoded?._id) return next(new Error('Invalid token'))
    socket.data.user = { _id: String(decoded._id), isAdmin: decoded.isAdmin }
    next()
  } catch {
    next(new Error('Invalid token'))
  }
}
