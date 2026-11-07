"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadSingle = exports.uploadMultiple = void 0;
const multer_storage_cloudinary_1 = require("multer-storage-cloudinary");
const multer_1 = __importDefault(require("multer"));
const cloudinary_1 = __importDefault(require("./cloudinary"));
const storage = new multer_storage_cloudinary_1.CloudinaryStorage({
    cloudinary: cloudinary_1.default,
    params: async (_req, file) => ({
        folder: 'TripTix',
        allowed_format: ['jpg', 'jpeg', 'png'],
        public_id: file.originalname.split('.')[0],
    }),
});
const upload = (0, multer_1.default)({ storage: storage });
exports.uploadMultiple = upload.array('buses', 5);
exports.uploadSingle = upload.single('profile');
//# sourceMappingURL=storage.js.map