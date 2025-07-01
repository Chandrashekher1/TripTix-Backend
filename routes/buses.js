const Seat = require('../models/seat')
const Route = require('../models/routes')
const Buses = require('../models/buses')
const express = require('express')
const router = express.Router()
const { Types } = require('mongoose');
const admin = require('../middleware/Admin')
const auth = require('../middleware/auth')
const { uploadMultiple } = require('../config/storage')


router.get('/' , async(req,res) => {
    try{
        const {origin, destination, date} = req.query
        if(!origin || !destination || !date){
            return res.status(400).json({message: "Missing required fields: origin, destination, date"})
        }
        const route = await Route.findOne({origin,destination})
        if(!route){
            return res.status(404).json({message: "Route not found"})
        }
        const startOfDay = new Date(date)
        const endOfDay = new Date(startOfDay.getTime() + 24*60*60*1000-1)

        const buses = await Buses.find({
            routeId: route._id,
            dept_time: {$gte: startOfDay, $lte: endOfDay}
        })

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

router.get('/:id/seats' , async(req,res) => {
    try{
        const busId = req.params.id
        if(!Types.ObjectId.isValid(busId)){
            return res.status(400).json({message: "Invalid bus ID"})
        }
        const seats = await Seat.find({busId: new ObjectId(busId)})
        res.json(seats)
    }
    catch(err){
        res.status(500).json({success:false, message: "Internal Server error."})
    }
})

router.post('/', [auth,admin], uploadMultiple, async(req,res) => {
    try{
        const {routesId,busNumber,busType, operator, dep_time,arrivalTime,isAc, isSleeper,isSeater,price, totalSeat,} = req.body
        if(!routesId || !busNumber ||!busType ||!operator ||!dep_time ||!arrivalTime || isAc ||!isSeater ||!price ||!price){
            return res.status(400).json({message:"Missing required fields"})
        }
        if (!Types.ObjectId.isValid(routesId)) {
            return res.status(400).json({ message: "Invalid route ID" });
        }
        const image = req.files?.map((image) => image.path)
        let buses = new Buses({
            routeId:new Types.ObjectId(routesId),
            busNumber,
            busType,
            operator,
            isAc,
            isSeater,
            isSleeper,
            price:parseFloat(price) ,
            totalSeat,
            dep_time:new Date(dep_time),
            arrivalTime: new Date(arrivalTime),
            images:image
        })
        buses = await buses.save()
        res.status(200).json({success: true, message:"Bus added successfully", data: buses})
    }catch(err){
        return  res.status(500).json({success:false,message: "Internal Server error", error: err.message})
    }
})

router.patch('/:id', [auth,admin], uploadMultiple, async(req,res) => {
    try{
        const {routesId,busNumber,busType, operator, dep_time,arrivalTime,isAc, isSleeper,isSeater,price, totalSeat,} = req.body
        if (!Types.ObjectId.isValid(routesId)) {
            return res.status(400).json({ message: "Invalid route ID" });
        }
        const image = req.files?.map((image) => image.path)
        let buses =  Buses.findByIdAndUpdate(req.params.id, {
            routeId:new Types.ObjectId(routesId),
            busNumber,
            busType,
            operator,
            isAc,
            isSeater,
            isSleeper,
            price:parseFloat(price) ,
            totalSeat,
            dep_time:new Date(dep_time),
            arrivalTime: new Date(arrivalTime),
            images:image

        }, {new: true})
        if(!buses) return res.status(400).json({message:"Something went wrong."})
        res.status(200).json({success:true, message:"bus updated successfully", data:buses})
    }
    catch(err) {
        res.status(500).json({success:false, message:"Internal server error" , error: err.message})
    }
})

router.delete('/:id', [auth,admin], async(req,res) => {
    try{
        const bus = Buses.findByIdAndDelete(req.params.id)
        if(!bus) return res.status(400).json({message: "No bus find with this Id"})

        res.send(bus)
    }
    catch(err){
        return res.status(500).json({success:false, message: "Internal server error"})
    }
})

module.exports = router