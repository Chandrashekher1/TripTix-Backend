const bus = require('../routes/bus')
const booking = require('../routes/booking')
const seat = require('../routes/seat')
const route = require('../routes/route')
const user =  require('../routes/users')
const express = require('express')
const auth = require('../middleware/auth')

module.exports = function (app){
    app.use(express.json())
    app.use(express.urlencoded)
    app.use('/api/v1/user/signup',user)
    app.use('/api/v1/user/login',auth)
    app.use('/api/v1/route',route)
    app.use('/api.v1/seat', seat)
    app.use('/api/v1/booking', booking)
    app.use('/api/v1/bus',bus)
}