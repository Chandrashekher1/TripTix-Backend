const express = require('express')
const { Seat } = require('../models/seat')
const router = express.Router()

router.get('/', async(req,res) => {
    try{
        const {busId, seatIds, userId, passengerDetails} = req.body
        if(!ObjectId.isValid(busId) || !seatIds.every(id => ObjectId.isValid(id)) || !ObjectId.isValid(userId)){
            return res.status(400).json({message:"Invalid bus, seat, or user ID"})
        }
        if(!passengerDetails || Array.isArray(passengerDetails) || passengerDetails.length !== seatIds.length){
            return res.status(400).json({message: "Invalid passenger details."})
        }
        for(const passenger of passengerDetails){
            if(!passenger.name || !passenger.age || !passenger.gender){
                return res.status(400).json({message:"Missing passenger details."})
            }
        }
        const seats = await Seat.find({
            _id: {$in: seatIds.map(id => new ObjectId(id))},
            busId: new ObjectId(busId),
            userId: new ObjectId(userId),
            status: "locked"
        }).toArray()
        if(seats.length !== seatIds.length){
            return res.status(409).json({message: "Invalid seat lock."})
        }
        res.json({success:true, data:seats})

    }catch(err){
        return res.status(500).json({success:false, message: "Internal error", error: err.message})
    }
})

module.exports = router