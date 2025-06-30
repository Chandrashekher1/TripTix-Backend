const Buses = require('../models/buses')
const express = require('express')
const router = express.Router()

router.get('/' , async(req,res) => {
    try{
        const buses = await Buses.find() 
        if(!buses) return res.status(400).json({message: "Buses not available"})
        res.json({success: true, data:buses})
    }
    catch(err){
        res.status(500).json({success:false, message:"Internal server error."})
    }
})

router.post('/', )