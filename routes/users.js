const bcrypt = require('bcrypt')
const uploadSingle = require('../config/storage')
const auth = require('../middleware/auth')
const {Users,Validate} = require('../models/users')
const express = require('express')
const router = express.Router()

router.get('/me',auth, async(req,res) => {
    try{
        const users = await Users.findById(req.user._id).select('-password')
        res.status(200).json({  success: true, data: users})
    }
    catch(error){
        res.status(500).json({success:false ,message: error.message})
    }
})

router.get('/user/:id',auth,async(req,res) => {
    try{
        const users = await Users.findById(req.params.id).select('-password')
        res.status(200).json({success:true,data:users})
    }
    catch(error){
        res.status(500).json({success: false, message: error.message})
    }
})

router.post('/' , async(req,res) => {
    try{
        const {error} = await Validate(req.body)
        if(error) return res.status(400).json({success: false, message: error.details[0].message})
        
        let user = await Users.find({email: req.body.email})
        if(user) return res.status(400).json({success: false, message: "User already exists"})
        
        user = new Users({
            name: req.body.name,
            email: req.body.email,
            password: req.body.password,
            phone: req.body.phone
        })

        const salt = await bcrypt.genSalt(10)
        user.password = await bcrypt.hash(req.body.password,salt)
        user = await user.save()
        const token = user.generateAuthToken()

        res.status(201).header('Authorization',token)
        .json({success: true, token, message:"User registered successfully.", data: user})
    }catch(error){
        res.status(500).json({success: false,message: "Registration failed", error: error.message})
    }
})

router.put('/:id', auth, uploadSingle, async(req,res) => {
    try{
        const {error} = Validate(req.body)
        if(error) return res.status(400).json({success:true, message:error.details[0].message})

        let user = await Users.findByIdAndUpdate(req.params.id,
            {
                name:req.body.name,
                email: req.body.email,
                phone: req.body.phone
            },
            {new : true}
        ).select('-password')

        if(!user) return res.status(404).json({message: "User not found"})
        res.send(user)
    }
    catch(error){
        res.status(500).json({success: false, message: error.details[0].message})
    }
})

router.patch('/:id',auth, uploadSingle, async(req,res) => {
    try{
        let user = await Users.findByIdAndUpdate(req.params.id,{
            name: req.body.name,
            email: req.body.email,
            phone: req.body.phone,
            password: req.body.password
        }, {new : true})

        if(!user) return res.status(400).json({success: false, message:"User not found"})
        res.send(user)
    }
    catch(error){
        res.status(500).json({success:false, message:error.details[0].message})
    }
})

module.exports = router