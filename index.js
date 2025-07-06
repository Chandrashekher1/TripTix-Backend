const cors = require('cors')
const db = require('./config/db')
const express = require('express')
const app = express()
require('dotenv').config()

app.use(cors({
    origin:'*',
    methods: ['GET','POST','PUT','PATCH'],
    allowedHeaders: ["Content-Type", "Authorization"],
    exposedHeaders:["Authorization"],
    credentials: true
}))

db
require('./startup/routes')(app)

app.listen(3000, () => {
    console.log(`Listening on port 3000...`)
})


