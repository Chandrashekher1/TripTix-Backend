const mongoose = require('mongoose')

const RoutesSchema = mongoose.Schema({
    origin: {
        type: String,
        required: true,
        lowercase:true
    },
    destination: {
        type: String,
        required: true,
        lowercase: true
    },
    distance: {
        type: Number,
        required: true
    }
})

const RoutesModel = mongoose.model('Routes',RoutesSchema)
module.exports.Routes = RoutesModel