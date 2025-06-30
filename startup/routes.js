const route = require('../routes/route')
const user =  require('../routes/users')
const express = require('express')

module.exports = function (app){
    app.use(express.json())
    app.use(express.urlencoded)
    app.use('/api/v1/user/signup',user)
    app.use('/api/v1/route',route)
}