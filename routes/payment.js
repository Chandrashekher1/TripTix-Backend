const {Types} = require('mongoose')
const crypto = require('crypto')
const razorpay = require('../config/razorpay')
const express = require('express')
const auth = require('../middleware/auth')
const router = express.Router()


router.post('/create-order', [auth], async(req,res) => {
    const { amount } = req.body;
    const options = {
        amount: amount * 100, // Amount in paise
        currency: 'INR',
    };
    try {
        const order = await razorpay.orders.create(options);
        res.json(order);
    } catch (error) {
        res.status(500).send(error);
    }
})


app.post('/verify-payment', (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const shasum = crypto.createHmac('sha256', process.env.razorpay_key_secret);
    shasum.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const digest = shasum.digest('hex');

    if (digest === razorpay_signature) {
        // Payment is valid
        // Update transaction status, etc.
        res.json({ status: 'success' });
    } else {
        res.status(400).json({ status: 'failure' });
    }
})

module.exports = router