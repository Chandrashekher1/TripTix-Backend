"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateLogin = void 0;
exports.validateAuth = validateAuth;
const joi_1 = __importDefault(require("joi"));
function validateAuth(data) {
    const schema = joi_1.default.object({
        email: joi_1.default.string().email().min(0).max(2000).required(),
        password: joi_1.default.string().required(),
    });
    return schema.validate(data);
}
exports.validateLogin = validateAuth;
//# sourceMappingURL=auth.js.map