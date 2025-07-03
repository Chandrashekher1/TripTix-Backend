const mongoose = require('mongoose')
require('dotenv').config()

const db = mongoose.connect(process.env.mongodb_uri, {
    useNewUrlParser: true})
    .then(() => console.log("MongoDB connnected..."))
    .catch((err) => console.log(err.message))

module.exports = db