const admin = require('../middleware/admin')
const auth = require('../middleware/auth')
const {Routes} = require('../models/routes')
const express = require('express')
const router = express.Router()

router.get('/',async(req,res) => {
    try{
        const {origin, destination} = req.query
        if(!origin || !destination) return res.status(400).json({message: "Missing origin or destination."})
        
        const routes = await Routes.findOne({origin,destination})
        if(!routes) return res.status(404).json({message:"No routes found."})

        res.json({success:true, data:routes})
    }
    catch(err){
        res.status(500).json({success:false, message:"Internal Server error.", error: err.message})
    }
})

router.post('/',[auth,admin],async(req,res) => {

    try{
        const {origin,destination,distance} = req.body
        if(!origin || !destination || !distance) return res.status(400).json({message: "Missing or invalid fields: origin,destination,distance"})
        
        const existingRoute = await Routes.find({origin,destination})
        if(!existingRoute) return res.status(409).json({message: "Route already exists"})
        
        let routes = new Routes({
            origin: origin,
            destination : destination,
            distance: distance
        })

        routes = await routes.save()
        res.status(200).json({success:true, routeId:routes.insertedId, message:"Routes created successfully."})   
    }
    catch(err){
        return res.status(500).json({success:false, message:"Internal Server error.", error:err.message})
    }
    
})

router.patch('/:id' , [auth,admin], async(req,res) => {
    try{
        let routes = await Routes.findByIdAndUpdate(req.params.id,
            {
                origin: req.body.origin,
                destination: req.body.destination,
                distance: req.bosy.distance
            },
            {new : true}
        )
        routes = await routes.save()
        res.json({success: true, data:routes})
    }
    catch(err){
        res.status(500).json({success: false, message: "Internal server error.", error: err.message})
    }
})

router.delete('/:id', [auth,admin], async(req,res) => {
    try{
        const routes = await Routes.findByIdAndDelete(req.params.id)
        if(!routes) return res.status(404).json({message:"Route is not available with this ID."})
        res.json({success:true, message: "route deleted successfully."})
    }
    catch(err){
        res.status(500).json({message: "Internal server error", error: err.message})
    }
})

module.exports = router