import 'dotenv/config'
import http from 'http'
import cors from 'cors'
import express from 'express'
import { Server } from 'socket.io'
import connectDB from './config/db'
import setupRoutes from './startup/routes'
import handleSocketConnection from './routes/socket'
import { startLockExpiryWorker } from './services/lockExpiryWorker'

const app = express()
const server = http.createServer(app)

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Authorization'],
    credentials: true,
  },
})

// Make io accessible globally
declare global {
  // eslint-disable-next-line no-var
  var io: Server
}
global.io = io

handleSocketConnection(io)

app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Authorization'],
    credentials: true,
  })
)

setupRoutes(app)
connectDB().then(() => startLockExpiryWorker(io))

const PORT = process.env.PORT || 3000
server.listen(PORT, () => {
  console.log(`Listening on port ${PORT}...`)
})

