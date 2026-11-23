"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.socketAuth = socketAuth;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
function socketAuth(socket, next) {
    const token = socket.handshake.auth?.token;
    if (typeof token !== 'string' || token.length === 0) {
        return next(new Error('Authentication required'));
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.jwtPrivateKey);
        if (!decoded?._id)
            return next(new Error('Invalid token'));
        socket.data.user = { _id: String(decoded._id), isAdmin: decoded.isAdmin };
        next();
    }
    catch {
        next(new Error('Invalid token'));
    }
}
//# sourceMappingURL=socketAuth.js.map