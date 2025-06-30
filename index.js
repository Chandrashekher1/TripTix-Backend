const db = require('./config/db')
const express = require('express')
const app = express()
require('dotenv').config()

require('./startup/routes')(app)
if (!process.env.jwtPrivateKey) {
    console.error('FATAL ERROR: jwtPrivateKey is not defined.');
    process.exit(1);
}
db
app.listen(3000, () => {
    console.log(`Listening on port 3000...`)
})
