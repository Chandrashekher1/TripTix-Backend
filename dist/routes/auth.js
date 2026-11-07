"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const users_1 = require("../models/users");
const auth_1 = require("../validations/auth");
const router = express_1.default.Router();
// POST / — login
router.post('/', async (req, res) => {
    try {
        const { error } = (0, auth_1.validateAuth)(req.body);
        if (error)
            return res.status(400).send(error.details[0].message);
        const user = await users_1.Users.findOne({ email: req.body.email });
        if (!user)
            return res.status(400).json({ message: 'User is not registered' });
        const validPassword = await bcrypt_1.default.compare(req.body.password, user.password);
        if (!validPassword)
            return res.status(400).json({ message: 'Invalid Password' });
        const token = user.generateAuthToken();
        return res.header('Authorization', token).json({
            _id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone
        });
    }
    catch (err) {
        const error = err;
        console.error('Login error', error);
        return res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
});
exports.default = router;
//# sourceMappingURL=auth.js.map