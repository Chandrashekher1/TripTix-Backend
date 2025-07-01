const db = require('./config/db')
const express = require('express')
const app = express()
require('dotenv').config()

db

// app.get('/', (req, res) => {
//     res.send('Welcome to TripTix API')  })

require('./startup/routes')(app)


app.listen(3000, () => {
    console.log(`Listening on port 3000...`)
})


