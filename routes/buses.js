const {Seat} = require('../models/seat')
const {Routes} = require('../models/routes')
const Buses = require('../models/buses')
const express = require('express')
const router = express.Router()
const { Types } = require('mongoose');
const admin = require('../middleware/admin')
const auth = require('../middleware/auth')
const { uploadMultiple } = require('../config/storage')

router.get('/topRated' , async(req,res) => {
    try{
        const bus = await Buses.find().populate('routesId')
        if(!bus){
            return res.status(404).json({message: "Route not found"})
        }
        res.json(bus)
    }
    catch(err){
        res.status(500).json({success:false, message:"Internal server error.", error: err.message})
    }
})
router.get('/' , async(req,res) => {
    try{
        const {origin, destination, date} = req.query
        if(!origin || !destination ){
            return res.status(400).json({message: "Missing required fields: origin, destination, date"})
        }
        const route = await Routes.findOne({origin,destination})
        if(!route){
            return res.status(404).json({message: "Route not found"})
        }
        const buses = await Buses.find({
            routesId: route._id,
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
        res.status(500).json({success:false, message:"Internal server error.", error: err.message})
    }
})

router.get('/:id' , async(req,res) => {
    try{
        const busId = req.params.id
        if(!Types.ObjectId.isValid(busId)){
            return res.status(400).json({message: "Invalid bus ID"})
        }
        const seats = await Buses.findById(busId).populate('routesId')
        res.json(seats)
    }
    catch(err){
        res.status(500).json({success:false, message: "Internal Server error."})
    }
})

router.post('/', [auth,admin], uploadMultiple, async(req,res) => {
    try{
        const {routesId,busNumber,busType, operator, dep_time,arrivalTime,isAc, isSleeper,isSeater,price, totalSeat,rating,isWifi} = req.body
        if(!routesId || !busNumber ||!busType ||!operator ||!dep_time ||!arrivalTime ||!price ||!totalSeat){
            return res.status(400).json({message:"Missing required fields"})
        }
        if (!Types.ObjectId.isValid(routesId)) {
            return res.status(400).json({ message: "Invalid route ID" });
        }
        const image = req.files?.map((image) => image.path)
        // if(!image || image.length === 0) {
        //     return res.status(400).json({message: "Please upload at least one image"})
        // }
        let buses = new Buses({
            routesId:new Types.ObjectId(routesId),
            busNumber,
            busType,
            operator,
            isAc,
            isSeater,
            isSleeper,
            isWifi,
            price:parseFloat(price) ,
            totalSeat,
            rating: parseFloat(rating) || 1,
            dep_time:new Date(dep_time),
            arrivalTime: new Date(arrivalTime),
            // images:image
        })
        buses = await buses.save()
        console.log(buses);
        
        res.status(200).json({success: true, message:"Bus added successfully", data: buses})
    }catch(err){
        console.error(err);
        return  res.status(500).json({success:false,message: "Internal Server error", error: err.message})
    }
})

router.patch('/:id', [auth,admin], async(req,res) => {
    try{
        const {routesId,busNumber,busType, operator, dep_time,arrivalTime,isAc, isSleeper,isSeater,price, totalSeat,} = req.body
        if (!Types.ObjectId.isValid(routesId)) {
            return res.status(400).json({ message: "Invalid route ID" });
        }
        const image = req.files?.map((image) => image.path)
        let buses = await Buses.findByIdAndUpdate(req.params.id, {
            routesId:new Types.ObjectId(routesId),
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
        const bus = await Buses.findByIdAndDelete(req.params.id)
        if(!bus) return res.status(400).json({message: "No bus find with this Id"})

        res.send(bus)
    }
    catch(err){
        return res.status(500).json({success:false, message: "Internal server error" , error: err.message})
    }
})

module.exports = router