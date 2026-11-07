import { Application } from 'express'
import express from 'express'
import payment from '../routes/payment'
import bus from '../routes/buses'
import booking from '../routes/booking'
import seat from '../routes/seat'
import route from '../routes/route'
import user from '../routes/users'
import auth from '../routes/auth'

export default function (app: Application): void {
  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))
  app.use('/api/v1/user', user)
  app.use('/api/v1/login', auth)
  app.use('/api/v1/route', route)
  app.use('/api/v1/seat', seat)
  app.use('/api/v1/booking', booking)
  app.use('/api/v1/bus', bus)
  app.use('/api/v1/payment', payment)
}

