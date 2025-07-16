const express = require('express');
const router = express.Router();
const { Booking } = require('../models/booking');
const auth = require('../middleware/auth');

router.post('/book', auth, async (req, res) => {
  try {
    const { userId, busId, passengerDetails, seatIds } = req.body;

    if (!userId || !busId || !passengerDetails?.length || !seatIds?.length) {
      return res.status(400).json({ success: false, message: 'Missing fields' });
    }

    const booking = new Booking({
      userId,
      busId,
      passengerDetails,
      seatIds
    });

    await booking.save();

    res.status(201).json({ success: true, message: 'Booking confirmed', booking });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
