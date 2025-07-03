const {Types} = require('mongoose')
const crypto = require('crypto')
const Booking = require('../models/booking')
const {Seat} = require('../models/seat')
const razorpay = require('../config/razorpay')
const {Payment} = require('../models/payment')
const express = require('express')
const auth = require('../middleware/auth')
const router = express.Router()


router.post('/create-order', [auth], async(req,res) => {
    try{
        const {bookingId, amount, userId} = req.body
        if(!Types.ObjectId.isValid(bookingId) || !Types.ObjectId.isValid(userId) || !amount){
            return res.status(400).json({message: "Missing or invalid fields: bookingId, amount, userId"})
        }

        const booking = await Booking.findOne({
            _id: new Types.ObjectId(bookingId),
            userId: new Types.ObjectId(userId),
            status: "pending"
        })

        if(!booking){
            return res.status(404).json({message: "Booking not found or not pending"})
        }

        const option = {
            amount: amount,
            currency: "INR",
            receipt:   `receipt_${bookingId}`,
            payment_capture: 1 // auto capture payment
        }

        try{
            const order = await razorpay.orders.create(option)
            res.json({
                success: true,
                status: "pending",
                orderId: order.id,
                amount: order.amount,
                currency: order.currency,
                message:"payment successfull"
            },)
        }catch(err){
            console.error("Error",err)
            await Seat.updateMany(
                {_id: {$in: booking.seatIds}, userId: new Types.ObjectId(userId)},
                {$set: {status: "available", lockedUntil: null, userId:null}}
            )

            await Payment.insertOne({
                bookingId: new Types.ObjectId(bookingId),
                userId: new Types.ObjectId(userId),
                amount,
                status: "failed",
                transactionId: null,
                createdAt: new Date()
            })

        }
    }
    catch(err){
        res.status(500).json({message:false, message:"Internal server error", error: err.message})
    }
})


router.post('/verify', [auth], async(req,res) => {
    try{
        const {bookingId, userId, razorpay_order_id, razorpay_payment_id, razorpay_signature} = req.body
        if(!Types.ObjectId.isValid(bookingId) || !Types.ObjectId.isValid(userId) || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature){
            return res.status(400).json({message: "Missing or invalid fields"})
        }

        const booking = await Booking.findOne({
            _id: new Types.ObjectId(bookingId),
            userId: new Types.ObjectId(userId),
            status: "pending"
        })

        if(!booking) {
            return res.status(404).json({message:"Booking not found."})
        }

        // verify signature

        const generatedSignature = crypto.createHmac('sha256', process.env.razorpay_key_secret)
            .update(`${razorpay_order_id} | ${razorpay_signature}`).digits('hex')

        if(generatedSignature !== razorpay_signature){
            await Seat.updateMany(
                {_id: {$in: booking.seatIds},
                userId: new Types.ObjectId(userId)},
                {$set: {status: "available", lockedUntil: null, userId: null}}
            )
        }

        await Payment.insertOne({
            bookingId: new Types.ObjectId(bookingId),
            userId: new Types.Object(userId),
            amount: booking.amount,
            status: "failed",
            transactionId: razorpay_payment_id,
            createdAt: new Date()
        })
    }

    catch(err) {
        res.status(400).json({success: false, message:"Internal server error", error: err.message})
    }
})

module.exports = router