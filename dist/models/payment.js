"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentModel = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const PaymentSchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, required: true, ref: 'users' },
    tripId: { type: mongoose_1.Schema.Types.ObjectId, required: true, ref: 'Trip' },
    seatIds: [{ type: mongoose_1.Schema.Types.ObjectId, required: true, ref: 'TripSeat' }],
    bookingId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Booking' },
    amountPaise: { type: Number, required: true, min: 1 },
    currency: { type: String, required: true, enum: ['INR'], default: 'INR' },
    razorpayOrderId: { type: String, required: true, unique: true },
    razorpayPaymentId: { type: String, unique: true, sparse: true },
    status: { type: String, required: true, enum: ['pending', 'completed', 'failed'], default: 'pending' },
    passengerDetails: [
        {
            name: { type: String, trim: true },
            age: { type: Number },
            gender: { type: String, trim: true },
        },
    ],
}, { timestamps: true });
exports.PaymentModel = mongoose_1.default.model('payment', PaymentSchema);
//# sourceMappingURL=payment.js.map