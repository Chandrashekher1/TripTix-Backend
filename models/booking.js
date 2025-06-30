const mongoose = require('mongoose')

const BookingSchema = mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: "Users"
    },
    busId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: "Buses"
    },
    seatId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: "Seat"
    },
    passengerDetails: [
        {
            name:{
                type:String,
                required: true
            },
            age:{
                type: String,
                required: true
            },
            gender: {
                type: String,
                required: true
            },
            seatPreference: {
                type: String,
                required: true
            }
        },
       
    ],
     status: {
        type: String
    },
    createAt:{
        type: Date,
        default: Date.now()
    }
})

const BookingModel = mongoose.model('Booking',BookingSchema)

module.exports.Booking = BookingModel