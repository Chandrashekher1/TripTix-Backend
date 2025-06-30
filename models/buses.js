const { required } = require('joi')
const mongoose = require('mongoose')

const BusSchema = mongoose.Schema({
    operator: {
        type: String,
        required: true
    },
    dep_time:{
        type: String,
        required: true,
    },
    arrivalTime: {
        type: String,
        required: true
    },
    isAc:{
        type: Boolean,
        required: true
    },
    isSeater: {
        type: Boolean,
        required: true
    },
    isSleeper: {
        type: Boolean,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    totalSeat: {
        type: Number,
        required: true
    },
    busType: {
        type: String,
        required: true
    },
    routesId:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Routes',
        required: true
    },
    images: [String],
    date: {
        type: Date,
        default: Date.now,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
})

const BusModel = mongoose.model('Buses',BusSchema)

module.exports = BusModel