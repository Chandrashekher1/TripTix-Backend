"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = default_1;
const express_1 = __importDefault(require("express"));
const payment_1 = __importDefault(require("../routes/payment"));
const buses_1 = __importDefault(require("../routes/buses"));
const booking_1 = __importDefault(require("../routes/booking"));
const seat_1 = __importDefault(require("../routes/seat"));
const route_1 = __importDefault(require("../routes/route"));
const users_1 = __importDefault(require("../routes/users"));
const auth_1 = __importDefault(require("../routes/auth"));
function default_1(app) {
    app.use(express_1.default.json());
    app.use(express_1.default.urlencoded({ extended: true }));
    app.use('/api/v1/user', users_1.default);
    app.use('/api/v1/login', auth_1.default);
    app.use('/api/v1/route', route_1.default);
    app.use('/api/v1/seat', seat_1.default);
    app.use('/api/v1/booking', booking_1.default);
    app.use('/api/v1/bus', buses_1.default);
    app.use('/api/v1/payment', payment_1.default);
}
//# sourceMappingURL=routes.js.map