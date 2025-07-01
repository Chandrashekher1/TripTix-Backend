const bcrypt = require('bcrypt');
const auth = require('../middleware/auth');
const { Users, Validate } = require('../models/users');
const express = require('express');
const router = express.Router();

router.get('/me', auth, async (req, res) => {
  try {
    const user = await Users.findById(req.user._id).select('-password');
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/user/:id', auth, async (req, res) => {
  try {
    const user = await Users.findById(req.params.id).select('-password');
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/signup', async (req, res) => {
  try {
    const { error } = Validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    let existingUser = await Users.findOne({ email: req.body.email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "User already exists" });
    }

    let user = new Users({
      name: req.body.name,
      email: req.body.email,
      password: req.body.password,
      phone: req.body.phone,
    });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(user.password, salt);
    user = await user.save();
    const token = user.generateAuthToken();

    res.status(201).header('Authorization', token).json({
      success: true,
      token,
      message: "User registered successfully.",
      data: user
    });

  } catch (error) {
    res.status(500).json({ success: false, message: "Registration failed", error: error.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { error } = Validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }

    const user = await Users.findByIdAndUpdate(
      req.params.id,
      {
        name: req.body.name,
        email: req.body.email,
        phone: req.body.phone,
      },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.status(200).json({ success: true, message: "User updated", data: user });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.patch('/:id', auth, async (req, res) => {
  try {

    const updateData = {
      name: req.body.name,
      email: req.body.email,
      phone: req.body.phone,
    };

    if (req.body.password) {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(req.body.password, salt);
    }

    const user = await Users.findByIdAndUpdate(req.params.id, updateData, { new: true }).select('-password');

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.status(200).json({ success: true, message: "User updated", data: user });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
