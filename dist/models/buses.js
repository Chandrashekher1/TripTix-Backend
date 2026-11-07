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
const mongoose_1 = __importStar(require("mongoose"));
const BusSchema = new mongoose_1.Schema({
    operator: { type: String, required: true },
    dep_time: { type: String, required: true },
    arrivalTime: { type: String, required: true },
    isAc: { type: Boolean, required: true },
    isSeater: { type: Boolean, required: true },
    isSleeper: { type: Boolean, required: true },
    isWifi: { type: Boolean, required: true },
    price: { type: Number, required: true },
    totalSeat: { type: Number, required: true },
    busType: { type: String, required: true },
    busNumber: { type: String, required: true },
    routesId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Routes', required: true },
    images: [String],
    date: { type: Date, default: Date.now },
    rating: { type: Number, default: 1, required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});
const BusModel = mongoose_1.default.model('Buses', BusSchema);
exports.default = BusModel;
//# sourceMappingURL=buses.js.map