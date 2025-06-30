const Seat = require('../models/seat')
const Route = require('../models/routes')
const Buses = require('../models/buses')
const express = require('express')
const router = express.Router()

router.get('/' , async(req,res) => {
    try{
        const {origin, destination, date} = req.query
        if(!origin || !destination || !date){
            return rers.status(400).json({message: "Missing required fields: origin, destination, date"})
        }
        const route = await Route.findOne({origin,destination})
        if(!route){
            return res.status(404).json({message: "Route not found"})
        }
        const startOfDay = new Date(date)
        const endOfDay = new Date(startOfDay.getTime + 24*60*60*1000-1)

        const buses = await Buses.find({
            routeId: route._id,
            dept_time: {$gte: startOfDay, $lte: endOfDay}
        }).toArray()

        for(const bus of buses){
            bus.availableSeats = await Seat.countDocuments({
                busId: bus._id,
                status: "available"
            })
        }
        res.json(buses)
    }
    catch(err){
        res.status(500).json({success:false, message:"Internal server error."})
    }
})

router('/:id/seats' , async(req,res) => {
    try{
        const busId = req.params.id
        if(!ObjectId.isValid(busId)){
            return res.status(400).json({message: "Invalid bus ID"})
        }
        const seats = await Seat.find({busId: new ObjectId(busId)}).toArray()
        res.json(seats)
    }
    catch(err){
        res.status(500).json({success:false, message: "Internal Server error."})
    }
})

router.post('/', )