const mongoose = require('mongoose');

const BookingSchema = mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "Users"
  },
  busId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "Buses"
  },
  seatIds: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Seat",
      required: true
    }
  ],
  passengerDetails: [
    {
      name: {
        type: String,
        required: true,
        lowercase: true
      },
      age: {
        type: String,
        required: true,
        lowercase: true
      },
      gender: {
        type: String,
        required: true,
        lowercase: true
      }
    }
  ],
  status: {
    type: String,
    default: "confirmed"
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const BookingModel = mongoose.model('Booking', BookingSchema);
module.exports.Booking = BookingModel;
