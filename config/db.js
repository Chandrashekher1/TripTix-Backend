const mongoose = require('mongoose')
require('dotenv').config

const db = mongoose.connect("mongodb://localhost:27017/")
    .then(() => console.log("MongoDB connnected..."))
    .catch((err) => console.log(err.message))


module.exports = db