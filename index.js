const socket = require('./routes/socket')
const http = require('http')
const cors = require('cors')
const db = require('./config/db')
const express = require('express')
const app = express()
require('dotenv').config()

const server =  http.createServer(app) // http server
const {Server} = require('socket.io') // socket server

const io = new Server(server, {
    cors : {
        origin:'*',
        methods: ['GET','POST','PUT','PATCH'],
        allowedHeaders: ["Content-Type", "Authorization"],
        exposedHeaders:["Authorization"],
        credentials: true
    }
})

global.io // for access in routes

socket(io)

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Authorization'],
  credentials: true
}));

db
require('./startup/routes')(app)

server.listen(3000, () => {
    console.log(`Listening on port 3000...`)
})


