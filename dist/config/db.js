"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const connectDB = async () => {
    const uri = process.env.mongodb_uri;
    if (!uri) {
        console.error('mongodb_uri is not defined in environment variables');
        process.exit(1);
    }
    await mongoose_1.default
        .connect(uri)
        .then(() => console.log('MongoDB connected...'))
        .catch((err) => console.log(err.message));
};
exports.default = connectDB;
//# sourceMappingURL=db.js.map