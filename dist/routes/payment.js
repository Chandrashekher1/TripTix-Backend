"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = __importDefault(require("../middleware/auth"));
const razorpay_1 = __importDefault(require("../config/razorpay"));
const router = express_1.default.Router();
// POST /create-order — create Razorpay order
router.post('/create-order', [auth_1.default], async (req, res) => {
    const { amount } = req.body;
    console.log(amount);
    const options = {
        amount: amount * 100,
        currency: 'INR',
    };
    try {
        const order = await razorpay_1.default.orders.create(options);
        return res.json(order);
    }
    catch (error) {
        return res.status(500).send(error);
    }
});
exports.default = router;
//# sourceMappingURL=payment.js.map