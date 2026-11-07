"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
function auth(req, res, next) {
    const token = req.header('Authorization');
    if (!token) {
        res.status(401).send('Access denied. No token provided');
        return;
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.jwtPrivateKey);
        req.user = decoded;
        next();
    }
    catch {
        res.status(400).send('Invalid token.');
    }
}
exports.default = auth;
//# sourceMappingURL=auth.js.map