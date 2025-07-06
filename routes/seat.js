const {Seat} = require('../models/seat')
const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth');
const { isValidObjectId, Types } = require('mongoose');
const admin = require('../middleware/admin');

router.get('/:id', [auth], async(req,res) => {
  try{
    const busId = req.params
    if(!isValidObjectId(busId)){
      return res.status(400).json({ error: "Invalid bus ID" });
    }

    const seats = await Seat.find({busId: new Types.ObjectId(busId)})
    if(!seats || seats.length === 0) {
      return res.status(404).json({ message: "No seats found for this bus." });
    }
    res.json({success: true, data: seats});
  }
  catch(err){
    res.status(500).json({message: "internal Server error", error:err.message});
  }
})

router.post('/', [auth], async (req, res) => {
  try {
    const { busId, seatIds, userId } = req.body;

    if (
      !isValidObjectId(busId) ||
      !Array.isArray(seatIds) ||
      !seatIds.every(id => isValidObjectId(id)) ||
      !isValidObjectId(userId)
    ) {
      return res.status(400).json({ error: "Invalid bus, seat, or user ID" });
    }

    const seats = await Seat.find({
      _id: { $in: seatIds.map(id => new Types.ObjectId(id)) },
      busId: new Types.ObjectId(busId),
      status: "available"
    });

    if (seats.length !== seatIds.length) {
      return res.status(409).json({ message: "Some seats are unavailable." });
    }

    await Seat.updateMany(
      {
        _id: { $in: seatIds.map(id => new Types.ObjectId(id)) }
      },
      {
        $set: {
          status: "locked",
          userId: new Types.ObjectId(userId),
          lockedUntil: new Date(Date.now() + 5 * 60 * 1000)
        }
      }
    );

    res.json({ message: "Seats locked successfully." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});




router.patch('/:id', [auth], async (req, res) => {
  try {
    const { busId, seatIds, userId } = req.body;

    if (
      !isValidObjectId(busId) ||
      !seatIds.every(id => isValidObjectId(id)) ||
      !isValidObjectId(userId)
    ) {
      return res.status(400).json({ error: "Invalid bus, seat, or user ID" });
    }

    const seats = await Seat.find({
      _id: { $in: seatIds.map(id => new Types.ObjectId(id)) },
      busId: new Types.ObjectId(busId),
      status: "available"
    });

    if (seats.length !== seatIds.length) {
      return res.status(409).json({ message: "Some seats are unavailable." });
    }

    await Seat.updateMany(
      {
        _id: { $in: seatIds.map(id => new Types.ObjectId(id)) }
      },
      {
        $set: {
          status: "locked",
          userId: new Types.ObjectId(userId),
          lockedUntil: new Date(Date.now() + 5 * 60 * 1000)
        }
      }
    );

    res.json({ message: "Seats locked successfully." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;

