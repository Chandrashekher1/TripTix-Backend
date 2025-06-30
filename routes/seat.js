const Seat = require('../models/seat')
const express = require('express')
const router = express.Router()
const { isValidObjectId } = require('mongoose');
const auth = require('../middleware/auth');
const admin = require('../middleware/Admin');


router.post('/',[auth,admin] ,async(req,res) => {
    try{
        const {busId, seatIds, userId} = req.body
        if(!Object.isValid(busId) || !seatIds.every(id => Object.isValid(id)) || !Object.isValid(userId)){
            return res.status(400).json({error: "Invalid bus,seat, or user ID"})
        }

        let seats = await Seat.find({
            _id: { $in: seatIds.map(id => new ObjectId(id)) },
            busId: new ObjectId(busId),
            status: "available"
            }).toArray()

        if(seats.length !== seatIds){
            return res.status(409).json({message: "Some seats are unavailable."})
        }
        await Seat.updateMany({
            _id: { $in: seatIds.map(id => new ObjectId(id)) }
            }, {
            $set: {
                status: "locked",
                userId: new ObjectId(userId),
                lockedUntil: new Date(Date.now() + 5 * 60 * 1000)
            }
            });

        res.json({message: "Seats locked successfully."})
    }
    catch(err){
        res.status(500).json({message: "Internal server error"})
    }    
})

router.patch('/', [auth,admin], async (req, res) => {
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

