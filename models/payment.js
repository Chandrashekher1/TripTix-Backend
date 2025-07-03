const mongoose = require('mongoose')

const PaymentSchema = mongoose.Schema({
    bookinId:{
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Booking'
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Users'
    },
    amount: {
        type: Number,
        required: true
    },
    status:{
        type: String,
        required: true,
        enum: ['pending', 'completed', 'failed'],
    },
    trainsactionId: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now()
    }
})
const paymentModel = mongoose.model('payment',PaymentSchema)

module.exports.Payemt = paymentModel