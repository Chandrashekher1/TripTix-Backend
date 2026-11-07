"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateUser = void 0;
exports.validateSignup = validateSignup;
exports.validateUserUpdate = validateUserUpdate;
const joi_1 = __importDefault(require("joi"));
function validateSignup(data) {
    const schema = joi_1.default.object({
        name: joi_1.default.string().min(3).max(200).required(),
        email: joi_1.default.string().email().min(0).max(2000).required(),
        password: joi_1.default.string().min(5).max(1024).required(),
        phone: joi_1.default.number().required(),
    });
    return schema.validate(data);
}
function validateUserUpdate(data) {
    const schema = joi_1.default.object({
        name: joi_1.default.string().min(3).max(200),
        email: joi_1.default.string().email().min(0).max(2000),
        phone: joi_1.default.number(),
    });
    return schema.validate(data);
}
// Aliases for backward compatibility
exports.validateUser = validateSignup;
//# sourceMappingURL=user.js.map