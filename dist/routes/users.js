"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const auth_1 = __importDefault(require("../middleware/auth"));
const users_1 = require("../models/users");
const user_1 = require("../validations/user");
const router = express_1.default.Router();
// GET /me — current user profile
router.get('/me', auth_1.default, async (req, res) => {
    try {
        const user = await users_1.Users.findById(req.user._id).select('-password');
        res.status(200).json({ success: true, data: user });
    }
    catch (error) {
        const err = error;
        res.status(500).json({ success: false, message: err.message });
    }
});
// GET /user/:id — get user by id
router.get('/user/:id', auth_1.default, async (req, res) => {
    try {
        const user = await users_1.Users.findById(req.params.id).select('-password');
        res.status(200).json({ success: true, data: user });
    }
    catch (error) {
        const err = error;
        res.status(500).json({ success: false, message: err.message });
    }
});
// POST /signup — register new user
router.post('/signup', async (req, res) => {
    try {
        const { error } = (0, user_1.validateSignup)(req.body);
        if (error)
            return res.status(400).json({ message: error.details[0].message });
        const existingUser = await users_1.Users.findOne({ email: req.body.email });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'User already exists' });
        }
        let user = new users_1.Users({
            name: req.body.name,
            email: req.body.email,
            password: req.body.password,
            phone: req.body.phone,
        });
        const salt = await bcrypt_1.default.genSalt(10);
        user.password = await bcrypt_1.default.hash(user.password, salt);
        user = await user.save();
        const token = user.generateAuthToken();
        return res.status(201).header('Authorization', token).json({
            success: true,
            token,
            message: 'User registered successfully.',
        });
    }
    catch (error) {
        const err = error;
        return res.status(500).json({ success: false, message: 'Registration failed', error: err.message });
    }
});
// PUT /:id — full update user
router.put('/:id', auth_1.default, async (req, res) => {
    try {
        const { error } = (0, user_1.validateUserUpdate)(req.body);
        if (error) {
            return res.status(400).json({ success: false, message: error.details[0].message });
        }
        const user = await users_1.Users.findByIdAndUpdate(req.params.id, { name: req.body.name, email: req.body.email, phone: req.body.phone }, { new: true }).select('-password');
        if (!user)
            return res.status(404).json({ success: false, message: 'User not found' });
        return res.status(200).json({ success: true, message: 'User updated', data: user });
    }
    catch (error) {
        const err = error;
        return res.status(500).json({ success: false, message: err.message });
    }
});
// PATCH /:id — partial update user
router.patch('/:id', auth_1.default, async (req, res) => {
    try {
        const updateData = {
            name: req.body.name,
            email: req.body.email,
            phone: req.body.phone,
        };
        if (req.body.password) {
            const salt = await bcrypt_1.default.genSalt(10);
            updateData.password = await bcrypt_1.default.hash(req.body.password, salt);
        }
        const user = await users_1.Users.findByIdAndUpdate(req.params.id, updateData, { new: true }).select('-password');
        if (!user)
            return res.status(404).json({ success: false, message: 'User not found' });
        return res.status(200).json({ success: true, message: 'User updated', data: user });
    }
    catch (error) {
        const err = error;
        return res.status(500).json({ success: false, message: err.message });
    }
});
exports.default = router;
//# sourceMappingURL=users.js.map