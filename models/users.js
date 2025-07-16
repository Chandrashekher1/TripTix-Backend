const jwt= require('jsonwebtoken')
const mongoose = require('mongoose')
const Joi = require('joi')

const UserSchema = mongoose.Schema({
    name: {
        type: String,
        required: true,
        lowercase: true,
        minlength: 2,
        maxlength:200
    },
    email: {
        type: String,
        required: true,
        lowercase: true,
        unique: true
    },
    password: {
        type: String,
        required: true,
        minlength: 5,
        maxlength: 1024,
    },
    phone: {
        type: Number,
        required: true,
        
    },
    image: {
        type: String,
    },
})

UserSchema.methods.generateAuthToken = function(){
    const token = jwt.sign({_id: this._id},process.env.jwtPrivateKey)
    return token
}


function validateUser(user){
    const Schema = Joi.object({
        name: Joi.string().min(3).max(200).required(),
        email: Joi.string().required(),
        password: Joi.string().min(5).max(1024).required(),
        phone: Joi.number().required()
    })
    return Schema.validate(user)
}

const UserModel = mongoose.model('users', UserSchema)

module.exports.Users = UserModel
module.exports.Validate = validateUser