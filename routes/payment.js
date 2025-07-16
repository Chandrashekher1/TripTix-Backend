const razorpay = require('../config/razorpay')
const express = require('express')
const auth = require('../middleware/auth')
const router = express.Router()


router.post('/create-order', [auth], async(req,res) => {
    const { amount } = req.body;
    console.log(amount);
    
    const options = {
        amount: amount * 100, 
        currency: 'INR',
    };
    try {
        const order = await razorpay.orders.create(options);
        res.json(order);
    } catch (error) {
        res.status(500).send(error);
    }
})


module.exports = router