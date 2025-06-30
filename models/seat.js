const { required, ref, date } = require('joi')
const mongoose = require('mongoose')

const SeatSchema = mongoose.Schema({
    seatNumber: {
        type: String,
        required: true
    },
    status: {
        type: String,
        required: true
    },
    lockedUntil: {
        type: String,
        required: true
    },
    seatPreference: {
        type: String,
        required: true
    },
    busId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Buses'
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Users'
    },
    date: {
        type: Date,
        default: Date.now()
    },
    createdAt:{
        type: Date,
        default: Date.now()
    },
    updatedAt: {
        type: Date,
        default: Date.now()
    }
})

const SeatModel = mongoose.model('Seat',SeatSchema)

module.exports.Seat = SeatModel